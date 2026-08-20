-- O trecho de um local tem de apontar para um local do mesmo dono.
--
-- As políticas antigas conferiam só o dono da linha. Com isso dava para
-- gravar um trecho seu pendurado no local de outra pessoa: ela nunca veria,
-- porque o select é por user_id, mas o dado fica torto no banco. Integridade
-- que depende só do app é integridade emprestada — se um dia outra tela
-- escrever nessa tabela, a garantia some junto.
--
-- Opcional: o app já filtra por dono em toda consulta. Rode quando for
-- conveniente. Pode rodar mais de uma vez.

drop policy if exists "place_legs_insert_own" on public.place_legs;
create policy "place_legs_insert_own" on public.place_legs
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.places p where p.id = place_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "place_legs_update_own" on public.place_legs;
create policy "place_legs_update_own" on public.place_legs
  for update using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.places p where p.id = place_id and p.user_id = auth.uid()
    )
  );
