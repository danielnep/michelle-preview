import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { can } from "./acl.mjs";
import { storedOriginalKey } from "./file-storage.mjs";

const fail = (message, status) => Object.assign(new Error(message), { status });
export function deletionIds(value) {
  if (!Array.isArray(value) || !value.length || value.length > 2000 ||
      value.some(id => typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)))
    throw fail("Selecione arquivos válidos para excluir.", 400);
  return [...new Set(value)].sort();
}

// A transação remove o catálogo e todas as abas do arquivo juntas. O original
// tem uma chave própria por envio; a limpeza nunca atinge uma nova importação.
export async function deleteFiles(pool, access, userId, requestedIds) {
  if (!can(access, "filesDelete")) throw fail("Seu acesso não permite excluir arquivos.", 403);
  const ids = deletionIds(requestedIds);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT id,uploaded_by,object_key FROM mc_files WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE", [ids]);
    if (!access.owner) {
      const links = await client.query("SELECT content->>'fileId' AS file_id,content->>'sector' AS sector FROM mc_records WHERE namespace='lots' AND content->>'fileId'=ANY($1::text[])", [ids]);
      for (const file of rows) {
        const sources = links.rows.filter(lot => lot.file_id === file.id);
        if ((sources.length && sources.some(lot => !access.sectors.includes(lot.sector))) ||
            (!sources.length && file.uploaded_by !== userId))
          throw fail("Um dos arquivos pertence a um setor fora do seu acesso. Nenhuma exclusão foi salva.", 403);
      }
    }
    const deletedIds = rows.map(file => file.id);
    const lots = await client.query("DELETE FROM mc_records WHERE namespace='lots' AND content->>'fileId'=ANY($1::text[])", [deletedIds]);
    for (const file of rows)
      await client.query("INSERT INTO mc_file_cleanup(object_key) VALUES($1) ON CONFLICT DO NOTHING", [storedOriginalKey(file)]);
    await client.query("DELETE FROM mc_files WHERE id=ANY($1::text[])", [deletedIds]);
    await client.query("COMMIT");
    return { deletedIds: ids, removedFiles: deletedIds.length, removedLots: lots.rowCount };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

export async function cleanDeletedObjects(pool, s3, bucket) {
  const { rows } = await pool.query("SELECT object_key FROM mc_file_cleanup ORDER BY created_at LIMIT 100");
  for (const file of rows) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: file.object_key }));
      await pool.query("DELETE FROM mc_file_cleanup WHERE object_key=$1", [file.object_key]);
    } catch (_) { /* A fila persiste para a próxima tentativa; nunca restaurar o catálogo. */ }
  }
}
