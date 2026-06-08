

## Trocar preco do produto de R$ 87,60 para R$ 87,74

Vou atualizar o preco em todos os lugares do projeto:

### Arquivos que serao alterados:

1. **src/components/product/ProductInfo.tsx**
   - Preco principal: R$ 87,60 → R$ 87,74
   - Parcela: 6x de R$ 18,57 → 6x de R$ 14,62

2. **src/pages/Checkout.tsx**
   - Constante UNIT_PRICE: 8760 → 8774

3. **supabase/functions/create-pix-payment/index.ts**
   - Valor padrao: 8760 → 8774

4. **supabase/functions/payment-webhook/index.ts**
   - Valor padrao: 8760 → 8774

Sao 4 arquivos no total, cobrindo a pagina do produto, checkout e as funcoes de pagamento no backend.

