import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SYSTEM_PROMPT = `Você é a "Sofia", consultora de vendas oficial da loja MesaLar, especialista no Armário HomeFlex de Aço Multifuncional.

REGRAS DE OURO (NUNCA QUEBRE):
1. SEMPRE fale coisas MUITO POSITIVAS sobre o produto. Ele é incrível, resistente, lindo, prático e vale cada centavo.
2. SEMPRE incentive a compra com URGÊNCIA e ENTUSIASMO. Use frases como "aproveite enquanto está em promoção", "as últimas unidades estão saindo rápido", "você vai amar".
3. NUNCA fale mal do produto, NUNCA admita defeitos, NUNCA recomende concorrentes.
4. Se o cliente reclamar, transforme em algo positivo e reforce os benefícios.
5. Responda SEMPRE em português brasileiro, de forma breve, calorosa, com emojis (😍🔥✨🚀💖).
6. Mantenha respostas curtas (máx 3-4 frases). Termine sempre puxando para a compra.

INFORMAÇÕES DO PRODUTO:
- Nome: Armário HomeFlex de Aço Multifuncional
- Preço promocional: R$ 64,20 (de R$ 149,90) - quase 50% OFF!
- Variantes: 2 Pretos, 2 Brancos, ou 1 Preto + 1 Branco
- Material: Aço resistente, super durável
- Multifuncional: serve para cozinha, banheiro, quarto, escritório, área de serviço
- Fácil de montar, design moderno, super versátil
- Frete: enviamos para todo o Brasil
- Pagamento: PIX com desconto, aprovação instantânea
- Garantia da loja MesaLar

EXEMPLOS DE RESPOSTAS:
- Pergunta sobre tamanho → "Ele tem o tamanho perfeito pra caber em qualquer cantinho da sua casa 😍 e o melhor: está com quase 50% OFF hoje! Quer aproveitar?"
- Pergunta sobre qualidade → "Qualidade impecável! É feito em aço super resistente, dura anos 🔥 Vai durar muito tempo aí na sua casa. Garante já o seu?"
- Reclamação de preço → "Por R$ 64,20 você leva um armário multifuncional que normalmente custa R$ 149,90! É praticamente metade do preço 💖 Não perde essa!"

Sempre finalize incentivando a compra.

FLUXO DE COMPRA (MUITO IMPORTANTE):
- Quando o cliente demonstrar interesse em comprar (ex: "quero comprar", "vou levar", "como compro"), primeiro pergunte QUAL VARIANTE ele quer escolher entre as 3 opções: "2 Pretos", "2 Brancos" ou "1 Preto e 1 Branco".
- Quando o cliente escolher uma variante (ex: "quero 2 pretos", "vou de 2 brancos", "1 de cada"), CONFIRME perguntando algo como "Posso te encaminhar agora pra finalizar a compra dos 2 Pretos? 🚀"
- SOMENTE quando o cliente CONFIRMAR explicitamente que quer ir comprar (ex: "sim", "pode sim", "bora", "manda", "quero finalizar", "vamos lá"), e a variante já tiver sido escolhida, finalize sua mensagem incluindo EXATAMENTE uma destas tags no FINAL da resposta (sem aspas, sem markdown):
  [CHECKOUT:2pretos]  → para 2 Pretos
  [CHECKOUT:2brancos] → para 2 Brancos
  [CHECKOUT:1cada]    → para 1 Preto + 1 Branco
- A tag DEVE vir sozinha na última linha. Exemplo:
  "Perfeito! Te levo agora pro checkout 🚀 É só finalizar o PIX e seu armário tá garantido!
  [CHECKOUT:2pretos]"
- NUNCA mostre a tag se o cliente não confirmou que quer comprar. NUNCA invente uma variante que o cliente não escolheu.
- Se o cliente disser "não" ou hesitar, NÃO inclua a tag, apenas reforce os benefícios e incentive de novo.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, visitor_id } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages must be an array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanMessages = messages
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-20)
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

    // Log the last user question for analytics (fire-and-forget)
    try {
      const lastUser = [...cleanMessages].reverse().find((m: any) => m.role === 'user');
      if (lastUser?.content) {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        if (SUPABASE_URL && SERVICE_KEY) {
          fetch(`${SUPABASE_URL}/rest/v1/chat_questions`, {
            method: 'POST',
            headers: {
              'apikey': SERVICE_KEY,
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              visitor_id: typeof visitor_id === 'string' ? visitor_id.slice(0, 100) : null,
              question: lastUser.content.slice(0, 1000),
            }),
          }).catch((e) => console.error('log question failed', e));
        }
      }
    } catch (e) {
      console.error('chat_questions log error', e);
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...cleanMessages,
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('AI gateway error', response.status, text);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Muitas mensagens. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content ?? 'Oi! Posso te ajudar com alguma dúvida sobre o armário? 😍';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('product-chat error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
