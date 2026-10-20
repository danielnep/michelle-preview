// Public-facing health remains independent of this private, sanitized Groq probe.
// It runs once after the Railway server starts and never sends customer data.
export async function checkGroqConnection({
  environment = process.env,
  fetcher = globalThis.fetch,
  logger = console,
  timeoutMs = 12000,
} = {}) {
  const key = environment.API_IA_GROQ || environment.GROQ_API_KEY;
  const model = environment.GROQ_MODEL || "openai/gpt-oss-120b";
  if (!key) {
    logger.warn("MICHELLE_GROQ_SELFTEST status=missing_key");
    return {ok:false,status:"missing_key"};
  }
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(),timeoutMs);
  try {
    // Do not log the API request, body, credential, or Groq's response.
    const response = await fetcher("https://api.groq.com/openai/v1/chat/completions",{
      method:"POST",
      headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
      signal:controller.signal,
      body:JSON.stringify({
        model,
        messages:[
          {role:"system",content:'Responda somente um objeto JSON válido com a propriedade "ok": true.'},
          {role:"user",content:'Teste técnico sintético. Retorne {"ok":true}.'}
        ],
        response_format:{type:"json_object"},
        max_completion_tokens:1024,
        ...(model.startsWith("openai/gpt-oss-")?{
          reasoning_effort:"low",include_reasoning:false
        }:{})
      })
    });
    if (!response.ok) {
      const status="http_"+response.status;
      logger.warn("MICHELLE_GROQ_SELFTEST status="+status);
      return {ok:false,status};
    }
    const body=await response.json();
    let parsed;
    try{parsed=JSON.parse(body?.choices?.[0]?.message?.content||"");}
    catch{parsed=null;}
    const valid=body?.choices?.[0]?.finish_reason==="stop" &&
      parsed && parsed.ok===true;
    logger[valid?"log":"warn"]("MICHELLE_GROQ_SELFTEST status="+(valid?"ok":"invalid_response"));
    return {ok:Boolean(valid),status:valid?"ok":"invalid_response"};
  }catch(error){
    const status=error?.name==="AbortError"?"timeout":"transport_error";
    logger.warn("MICHELLE_GROQ_SELFTEST status="+status);
    return {ok:false,status};
  }finally{clearTimeout(timer);}
}
