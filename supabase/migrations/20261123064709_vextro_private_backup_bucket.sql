insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vextro-backups','vextro-backups',false,52428800,array['application/octet-stream'])
on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=array['application/octet-stream'];