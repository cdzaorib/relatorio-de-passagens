-- Metrô, trem e VLT como meios de transporte.
--
-- O tipo transport_type nasceu com dois valores. Sem estes três, lançar um
-- trecho de metrô é recusado pelo banco: o app manda 'metro' e o Postgres não
-- conhece a palavra.
--
-- Rodar no SQL Editor do Supabase. Pode rodar mais de uma vez.
--
-- Nota: 'add value' não pode acontecer dentro de um bloco de transação em
-- versões antigas do Postgres. No SQL Editor do Supabase cada comando vai
-- solto, então isto passa. Se algum dia der erro de transação, rode uma linha
-- de cada vez.

alter type public.transport_type add value if not exists 'metro';
alter type public.transport_type add value if not exists 'trem';
alter type public.transport_type add value if not exists 'vlt';
