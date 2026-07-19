-- Create campus locations table
create table if not exists campus_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  abbreviation text not null,
  region text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table campus_locations enable row level security;

-- Policies for campus_locations
create policy "Anyone can read campus locations"
  on campus_locations for select
  using (true);

create policy "Admins can insert campus locations"
  on campus_locations for insert
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can update campus locations"
  on campus_locations for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

create policy "Admins can delete campus locations"
  on campus_locations for delete
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.is_admin = true
    )
  );

-- Preload default campus locations
insert into campus_locations (name, abbreviation, region) values
  ('Academic City University', 'ACU', 'Greater Accra Region'),
  ('Accra Institute of Technology', 'AIT', 'Greater Accra Region'),
  ('Accra Technical University', 'ATU', 'Greater Accra Region'),
  ('African University College of Communications and Business', 'AUCB', 'Greater Accra Region'),
  ('Akenten Appiah-Menka University of Skills Training and Entrepreneurial Development', 'AAMUSTED', 'Ashanti Region'),
  ('All Nations University', 'ANU', 'Eastern Region'),
  ('Anglican University College of Technology', 'ANGUTECH', 'Bono East Region'),
  ('Asanska University College of Design and Technology', 'AUCDT', 'Greater Accra Region'),
  ('Ashesi University', 'Ashesi', 'Eastern Region'),
  ('Bolgatanga Technical University', 'BTU', 'Upper East Region'),
  ('C.K. Tedam University of Technology and Applied Sciences', 'CKT-UTAS', 'Upper East Region'),
  ('Cape Coast Technical University', 'CCTU', 'Central Region'),
  ('Catholic University of Ghana', 'CUG', 'Bono Region'),
  ('Central University', 'Central', 'Greater Accra Region'),
  ('Garden City University', 'GCU', 'Ashanti Region'),
  ('Ghana Communication Technology University', 'GCTU', 'Greater Accra Region'),
  ('Ghana Institute of Management and Public Administration', 'GIMPA', 'Greater Accra Region'),
  ('Ho Technical University', 'HTU', 'Volta Region'),
  ('KAAF University', 'KAAF', 'Central Region'),
  ('Koforidua Technical University', 'KTU', 'Eastern Region'),
  ('Kumasi Technical University', 'KsTU', 'Ashanti Region'),
  ('Kwame Nkrumah University of Science and Technology', 'KNUST', 'Ashanti Region'),
  ('Methodist University Ghana', 'MUG', 'Greater Accra Region'),
  ('MountCrest University College', 'MCU', 'Greater Accra Region'),
  ('Pentecost University', 'Pentecost', 'Greater Accra Region'),
  ('Regional Maritime University', 'RMU', 'Greater Accra Region'),
  ('Simon Diedong Dombo University of Business and Integrated Development Studies', 'SDD-UBIDS', 'Upper West Region'),
  ('Sunyani Technical University', 'STU', 'Bono Region'),
  ('Takoradi Technical University', 'TTU', 'Western Region'),
  ('University for Development Studies', 'UDS', 'Northern Region'),
  ('University of Cape Coast', 'UCC', 'Central Region'),
  ('University of Education, Winneba', 'UEW', 'Central Region'),
  ('University of Energy and Natural Resources', 'UENR', 'Bono Region'),
  ('University of Environment and Sustainable Development', 'UESD', 'Eastern Region'),
  ('University of Ghana', 'UG', 'Greater Accra Region'),
  ('University of Health and Allied Sciences', 'UHAS', 'Volta Region'),
  ('University of Mines and Technology', 'UMaT', 'Western Region'),
  ('University of Professional Studies, Accra', 'UPSA', 'Greater Accra Region'),
  ('Valley View University', 'VVU', 'Greater Accra Region'),
  ('Wisconsin International University College', 'WIUC', 'Greater Accra Region')
on conflict (name) do nothing;
