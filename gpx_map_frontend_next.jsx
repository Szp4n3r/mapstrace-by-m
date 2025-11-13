# Project: GPX Map — Next.js + Tailwind + Supabase

## FILE: package.json

```json
{
  "name": "gpx-map-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "13.5.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@supabase/supabase-js": "2.28.0",
    "react-leaflet": "4.2.0",
    "leaflet": "1.9.4",
    "uuid": "9.0.0",
    "dayjs": "1.11.9"
  },
  "devDependencies": {
    "autoprefixer": "10.4.14",
    "postcss": "8.4.23",
    "tailwindcss": "3.4.8"
  }
}
```

---

## FILE: tailwind.config.js

```js
module.exports = {
  content: ["./pages/**/*.{js,jsx}", "./components/**/*.{js,jsx}", "./app/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        mapblue: '#e6f7ff',
        deepblue: '#0f172a',
        mapaccent: '#3b82f6',
        mapgray: '#f3f4f6'
      }
    }
  },
  plugins: []
}
```

---

## FILE: postcss.config.js

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

---

## FILE: styles/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,body,#__next{height:100%}
body{background:linear-gradient(180deg,#f8fafc,white)}
/* leaflet css fix for Next */
.leaflet-container{height:100%;width:100%}
```

---

## FILE: lib/supabaseClient.js

```js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if(!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## FILE: components/Layout.jsx

```jsx
import React from 'react';

export default function Layout({children, user, onSignOut, lang, setLang}){
  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-semibold text-deepblue">{/** Logo area */}
              <span className="text-mapaccent">GPX</span>-Mapper
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex gap-3 text-sm text-gray-600">
              <a className="hover:underline cursor-pointer">Pricing</a>
              <a className="hover:underline cursor-pointer">How to use</a>
            </div>

            <div className="flex items-center gap-3">
              <select value={lang} onChange={(e)=>setLang(e.target.value)} className="border px-2 py-1 rounded">
                <option value="pl">PL</option>
                <option value="en">EN</option>
              </select>

              {user ? (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-700">{user.email}</div>
                  <button className="btn bg-white border px-3 py-1 rounded" onClick={onSignOut}>Sign out</button>
                </div>
              ) : (
                <div className="hidden sm:block text-sm text-gray-500">Please sign in</div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>

      <footer className="bg-white border-t mt-4">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-gray-500 flex justify-between">
          <div>Designed by Michu</div>
          <div>© {new Date().getFullYear()}</div>
        </div>
      </footer>
    </div>
  );
}
```

---

## FILE: components/Sidebar.jsx

```jsx
import React from 'react';

export default function Sidebar({tracks, onToggle, onDelete, onEdit, onAdd, collapsed, setCollapsed}){
  return (
    <aside className={`bg-white border-r transition-all ${collapsed? 'w-16':'w-72'} h-full flex flex-col`}>
      <div className="p-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Trasy</div>
        <div>
          <button className="px-2 py-1 text-xs" onClick={()=>setCollapsed(s=>!s)}>{collapsed? '>' : '<'}</button>
        </div>
      </div>

      <div className="px-3 py-2">
        <button onClick={onAdd} className="w-full bg-mapaccent text-white py-2 rounded mb-3">Dodaj</button>
      </div>

      <div className="flex-1 overflow-auto px-2">
        {tracks.length===0 ? <div className="text-sm text-gray-400 px-2">Brak tras</div> : (
          tracks.map(t=> (
            <div key={t.id} className="flex items-center gap-2 p-2 border-b hover:bg-gray-50">
              <input type="checkbox" onChange={(e)=>onToggle(t, e.target.checked)} />
              <div className="flex-1 text-sm">
                <div className="font-medium truncate">{t.name}</div>
                <div className="text-xs text-gray-500 truncate">{t.activity_date || ''} — {(t.distance_meters||'')/1} m</div>
              </div>
              <div className="flex gap-1">
                <button className="text-xs px-2 py-1" onClick={()=>onEdit(t)}>Edytuj</button>
                <button className="text-xs px-2 py-1 text-red-500" onClick={()=>onDelete(t)}>Usuń</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t text-xs text-gray-500">Kosz</div>
    </aside>
  );
}
```

---

## FILE: components/MapArea.jsx

```jsx
import React, {useEffect, useRef} from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

// small helper component to programmatically add plain GPX via a URL
function GPXLayer({url, onLoaded}){
  const map = useMap();
  useEffect(()=>{
    if(!url) return;
    // use L.GPX plugin - it expects global L.GPX (we'll load script in _app)
    const g = new L.GPX(url, {async: true}).on('loaded', function(e){
      map.fitBounds(e.target.getBounds());
      if(onLoaded) onLoaded(e);
    }).addTo(map);
    return ()=>{ map.removeLayer(g); };
  }, [url]);
  return null;
}

export default function MapArea({activeUrls}){
  // activeUrls = array of {id, url}
  return (
    <div className="flex-1 h-full relative">
      <MapContainer center={[49.2,20.0]} zoom={11} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        {activeUrls.map(a=> <GPXLayer key={a.id} url={a.url} />)}
      </MapContainer>
    </div>
  );
}
```

---

## FILE: pages/_app.jsx

```jsx
import '../styles/globals.css';
import Script from 'next/script';

export default function App({Component, pageProps}){
  return (
    <>
      {/* load leaflet-gpx plugin from CDN - L.GPX uses global L */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet-gpx/1.7.0/gpx.min.js" strategy="beforeInteractive" />
      <Component {...pageProps} />
    </>
  );
}
```

---

## FILE: pages/index.jsx

```jsx
import React, {useEffect, useState} from 'react';
import Layout from '../components/Layout';
import Sidebar from '../components/Sidebar';
import MapArea from '../components/MapArea';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export default function Home(){
  const [user, setUser] = useState(null);
  const [lang, setLang] = useState('pl');
  const [collapsed, setCollapsed] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [active, setActive] = useState({}); // id->boolean
  const [activeUrls, setActiveUrls] = useState([]);

  useEffect(()=>{
    (async ()=>{
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      supabase.auth.onAuthStateChange((_e,s)=> setUser(s?.session?.user ?? null));
    })();
  },[]);

  useEffect(()=>{ loadTracks(); }, [user]);

  async function loadTracks(){
    if(!user) { setTracks([]); return; }
    const { data, error } = await supabase.from('tracks').select('*').eq('user_id', user.id).order('uploaded_at', {ascending:false});
    if(error) { console.error(error); return; }
    setTracks(data || []);
  }

  async function signOut(){ await supabase.auth.signOut(); setUser(null); }

  async function onToggle(track, checked){
    const copy = {...active}; copy[track.id] = checked; setActive(copy);
    // compute activeUrls
    const on = tracks.filter(t=> copy[t.id]).map(t=> ({id:t.id, url: supabase.storage.from('gpx-bucket').getPublicUrl(t.gpx_path).data.publicUrl}));
    setActiveUrls(on);
  }

  async function onDelete(track){
    if(!confirm('Usuń trasę?')) return;
    await supabase.from('tracks').delete().eq('id', track.id);
    await supabase.storage.from('gpx-bucket').remove([track.gpx_path]);
    loadTracks();
  }

  async function onEdit(track){
    const name = prompt('Nowa nazwa', track.name);
    if(!name) return;
    await supabase.from('tracks').update({name}).eq('id', track.id);
    loadTracks();
  }

  async function onAdd(){
    // open simple file picker using input element
    const input = document.createElement('input'); input.type='file'; input.accept='.gpx';
    input.onchange = async (e)=>{
      const f = e.target.files[0];
      if(!f) return;
      const name = f.name;
      const session = await supabase.auth.getSession();
      const uid = session?.data?.session?.user?.id;
      if(!uid) return alert('Zaloguj się');
      const path = `${uid}/${Date.now()}_${uuidv4()}_${name}`;
      const { error: upErr } = await supabase.storage.from('gpx-bucket').upload(path, f);
      if(upErr) return alert('Upload err: '+upErr.message);
      // try to calculate simple metrics locally
      const text = await f.text();
      const meta = parseGpxMetrics(text);
      const insert = {
        user_id: uid,
        name: name,
        description: '',
        gpx_path: path,
        uploaded_at: new Date().toISOString(),
        activity_date: meta.date,
        distance_meters: meta.distance,
        duration_seconds: meta.duration,
        avg_speed_m_s: meta.avg_speed,
        raw_json: meta
      };
      await supabase.from('tracks').insert([insert]);
      loadTracks();
    };
    input.click();
  }

  return (
    <Layout user={user} onSignOut={signOut} lang={lang} setLang={setLang}>
      <div className="w-full flex h-[calc(100vh-140px)]">
        <Sidebar tracks={tracks} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} onAdd={onAdd} collapsed={collapsed} setCollapsed={setCollapsed} />
        <MapArea activeUrls={activeUrls} />
      </div>
    </Layout>
  );
}

// small GPX parser used in two places
function parseGpxMetrics(gpxText){
  try{
    const parser = new DOMParser();
    const xml = parser.parseFromString(gpxText, 'application/xml');
    const trkpts = xml.querySelectorAll('trkpt');
    const coords = [];
    trkpts.forEach(pt=>{
      const lat = parseFloat(pt.getAttribute('lat'));
      const lon = parseFloat(pt.getAttribute('lon'));
      const tEl = pt.querySelector('time');
      const time = tEl ? new Date(tEl.textContent) : null;
      coords.push({lat,lon,time});
    });
    let distance = 0; for(let i=1;i<coords.length;i++) distance += hav(coords[i-1], coords[i]);
    let duration = 0; if(coords.length>1 && coords[0].time && coords[coords.length-1].time) duration = (coords[coords.length-1].time - coords[0].time)/1000;
    const avg_speed = duration>0 ? distance/duration : null;
    const date = coords.length>0 && coords[0].time ? coords[0].time.toISOString().slice(0,10) : null;
    return {distance: Math.round(distance), duration: Math.round(duration), avg_speed, date, points: coords.length};
  }catch(e){ return {distance:null,duration:null,avg_speed:null,date:null,points:0}; }
}
function hav(a,b){ const R=6371000; const rad = d=>d*Math.PI/180; const dLat=rad(b.lat-a.lat); const dLon=rad(b.lon-a.lon); const la1=rad(a.lat), la2=rad(b.lat); const s= Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2; return 2*R*Math.atan2(Math.sqrt(s), Math.sqrt(1-s)); }
```

---

## FILE: README.md

```md
# GPX Map App (Next.js + Tailwind + Supabase)

Quick start:
1. Create Supabase project, create `gpx-bucket` in Storage and run SQL schema to create `tracks` table (see SQL below).
2. Create a GitHub repo, push this project.
3. On Vercel, import repo and set env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

### SQL (create tracks table)
```sql
create extension if not exists pgcrypto;
create table public.tracks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  gpx_path text not null,
  uploaded_at timestamptz default now(),
  activity_date date,
  distance_meters numeric,
  duration_seconds integer,
  avg_speed_m_s numeric,
  raw_json jsonb
);
```

### Backup
- Use GitHub Actions to run `pg_dump` and `supabase storage download` on a schedule and store artifacts.

### Notes
- This starter uses public bucket URLs for simplicity. For privacy, switch to signed URLs and set RLS policies.
```
