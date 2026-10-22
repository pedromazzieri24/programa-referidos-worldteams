-- Bucket privado para los CV. Correr después de schema.sql.
-- Cada referente sube a su propia carpeta: cvs/<auth.uid>/<archivo>.pdf. n8n los lee y borra con la clave secreta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 5242880, array['application/pdf']);

create policy "subir CV a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Ver y borrar en la propia carpeta: la landing borra el PDF si la base rechaza el referido.
create policy "ver CV de mi carpeta" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "borrar CV de mi carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
