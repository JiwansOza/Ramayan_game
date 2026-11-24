# Ashok Vatika — Game Design Doc (v0.2)

> v0.2: art direction low-poly se **stylized-realistic** ki gayi (web par achhi quality ka reference dekhne ke baad), aur polish ke liye timeline 12 se 15 hafte.

> Working title. Doosre naam bhi chal sakte hain: "Sundar Kand", "Lanka ki Raat", "Mudrika".
> Platform: Web browser (desktop + phone), Unity 6. Akela developer, Unity mein naya. Pehla version: **10–15 minute ka demo**.

---

## 1. Ek line mein

**Raat ki Lanka mein chhote roop mein Hanuman: pehredaaron se chhup kar Ashok Vatika tak pahuncho, Sita Mata ko Rama ki mudrika do, aur jaate-jaate Lanka mein aag laga do.**

## 2. Kahani (Sundar Kand se)

1. Hanuman samudra laangh kar Lanka ki deewar par pahunchte hain. Shehar jag raha hai, mashaalein jal rahi hain.
2. Wo chhota roop lete hain aur chhatton, galiyon aur pedon ke raaste mahalon ke beech Sita ko dhoondhte hain.
3. Ashok Vatika mein, rakshasiyon ke pehre ke beech, Sita Mata milti hain. Hanuman Rama ki **mudrika** dete hain aur unse **choodamani** lete hain.
4. Pakde jaate hain (kahani ka hissa, cutscene). Poonch mein aag lagayi jaati hai.
5. **Lanka dahan:** chhatton par daudte hue mashaalein aur jhande jalao, phir samudra ki taraf chhalaang. Ant.

Tone: shraddha aur romanch. Hanuman ko kabhi mazaak ya ghatiya andaaz mein mat dikhao; wo chatur, tez aur shant hain.

## 3. Core loop (har zone mein yahi chakra)

```
Dekho (pehredaar kahan, roshni kahan)
  → Raasta chuno (chhat / ped / parchhai)
    → Chhupo ya bhatkao (patthar/phal phenko)
      → Aage badho → checkpoint (deep / mandir)
```

Pakde gaye → aakhri checkpoint se dobara (2–3 second, koi lamba saza nahi).

## 4. Mechanics (sirf yahi — isse zyada demo mein nahi)

| Mechanic | Kaise kaam karta hai | Kyun |
|---|---|---|
| **Chalna / daudna** | Daudna tez par **shor** karta hai (aas-paas ke pehredaar sunte hain) | Stealth ka faisla: tez ya chupke |
| **Kudna + latakna** | Chhatton, deewaron, pedon par kood; kinaare pakad kar chadhna (sirf marked ledges) | Lanka ka "upar wala raasta" |
| **Parchhai** | Roshni se bahar = kam dikhna. Mashaal ke paas = jaldi pakde jaoge | Map padhna mazedaar banata hai |
| **Chhupna** | Ghani jhaadi / ped ke patte mein ghus kar poori tarah gayab | Bachne ka safe zone |
| **Bhatkana** | Phal ya kankar phenko → pehredaar us awaaz ki taraf dekhne jaata hai | Ek hi "tool", kai tarah use |
| **Pehredaar** | Tay raaste par ghoomte hain (waypoints), aage **dekhne ka cone**. Suspicion meter: peela (shak) → laal (pakda) | Seedha, padhne mein aasaan AI |
| **Lanka dahan (finale)** | Timer ke saath chhatton par daud, 8 mashaal/jhande ko chhoo kar jalao, phir samudra ki taraf kood | Climax: stealth ke baad khulla action |

**Demo mein nahi (baad mein):** ladaai, bada roop, udna, health bar, inventory, dialogue choices.

## 5. Controls

| Kaam | Keyboard + mouse | Phone (touch) |
|---|---|---|
| Chalna | W A S D | Left thumb joystick |
| Camera | Mouse | Kahin aur drag |
| Daudna | Shift (hold) | Joystick poora dhakelo |
| Kudna / chadhna | Space | **Jump** button |
| Phenkna | Left click (hold = aim arc, chhodo = phenko) | **Throw** button hold → slide aim → chhodo |
| Kaam (mudrika dena, aag) | F | Context button (jab offer ho tabhi dikhe) |
| Pause | Esc / P | HTML pause button (shell se) |

Crouch nahi — chhote roop mein Hanuman hamesha chhupne layak hain; aawaaz sirf daudne se.

## 6. Level — ek hi scene, 5 zone (~12 minute)

| # | Zone | Samay | Kya sikhata hai | Naya cheez |
|---|---|---|---|---|
| 1 | **Lanka ki deewar** | 1.5 min | Chalna, kudna, chadhna (koi pehredaar nahi) | Tutorial hints |
| 2 | **Bazaar ki chhatein** | 3 min | Parchhai, pehla pehredaar, daudne ka shor | Suspicion meter |
| 3 | **Mahal ka aangan** | 3 min | Phal phenk kar bhatkana, 3–4 pehredaar | Distraction |
| 4 | **Ashok Vatika** | 2.5 min | Jhaadiyon mein chhupna, ghoomti rakshasiyan | Hiding; Sita se milan (cutscene) |
| 5 | **Lanka dahan** | 2 min | Timer, daud, kood | 8 mashaal, samudra jump → ending |

Har zone ke ant mein ek **deep (checkpoint)**. Zone 4 ke baad cutscene: pakde jaana + poonch mein aag (sirf camera + text + sound, koi complex animation nahi).

Map sketch (upar se):

```
 [Samudra]
    |
 (1) Deewar ──► (2) Bazaar chhatein ──► (3) Mahal aangan
                                              |
                     (5) Dahan route ◄── (4) Ashok Vatika (Sita)
                          |
                      [Samudra jump = END]
```

Zone 5 zone 2–3 ki hi chhatton ko dobara use karta hai (naya art kam lagega).

## 7. Art direction, sound, music

### 7.1 Look — stylized-realistic, raat ki Lanka

- **Style:** stylized-realistic (painted textures, thode bade shapes, asli jaisi roshni). Low-poly nahi. Lakshya: browser mein bhi "asli game" jaisa lage.
- **Palette:** chaand ki neeli-baingani roshni (thandi) vs mashaal/deep ki naarangi-sunehri (garam). **Roshni = khatra, parchhai = suraksha** — rang hi gameplay samjhaye.
- **Sone ki Lanka:** mahalon par sona aur laal patthar, jo mashaal ki roshni mein chamke. Ashok Vatika: ashok ke ped (laal-naarangi phool), kamal ka taalaab, chaandni mein chamakti patti.
- **Finale (dahan):** poora palette badal kar laal-naarangi, dhuan aur chingariyaan.
- **Apni pehchaan ka motif:** **mudrika (gol anguthi)** — HUD ke frames, checkpoint deep ka icon, buttons, loading bar. (Doosre game ka diamond motif istemal nahi karna.)
- **Reference board:** pehle hafte hi 20–30 reference pictures (Indian mandir/mahal architecture, raat ki mashaal waali photography, miniature paintings ke rang) ek folder `design/refs/` mein rakho. Har art faisla isi se milao.

### 7.2 Assets kahan se

| Cheez | Source | Note |
|---|---|---|
| Lanka ke mahal, galiyaan, chhatein | Asset Store: stylized fantasy/Asian/Middle-Eastern palace aur town packs | Sirf **URP compatible**; ek hi artist/style ke 2–3 pack — mix-and-match se sasta lagta hai |
| Ashok Vatika ke ped, ghaas, phool | Asset Store: stylized nature pack | Ashok ped ke liye kisi ped ka material/rang badlo |
| Hanuman | (a) Stylized vanar/monkey character + Mixamo animations, (b) 3D artist ko commission (Fiverr/ArtStation), (c) Reallusion Character Creator | Sabse zaroori asset — budget ka bada hissa yahan. Shraddha wala, sundar aur chatur roop |
| **Hanuman — abhi ka faisla (24 Nov 2026)** | Sketchfab ka "lord-hanuman" model (poonch, gada, tilak, maala ke saath); prototype mein 1.7 MB tak halka karke code se banaya simple rig | **Baaki:** Sketchfab page se license aur creator ka naam pakka karna (credits mein jodna); final game ke liye artist se T-pose + asli rig (poonch ki haddiyon ke saath) aur Mixamo animations |
| Pehredaar (rakshas) | Stylized orc/demon/warrior pack, rang aur gehne badal kar | 2 type kaafi |
| Mashaal, aag, chingari, dhuan | Unity Particle System / VFX Graph + free VFX packs | Dahan ka maza isi par |
| Opening/ending picture | AI image tool se concept art, ya artist | Web page ka pehla impression |
| Blockout | ProBuilder (Unity ke andar) | Hafte 3–8 tak sirf yahi |

**Budget ka andaza:** assets ₹5,000–20,000; Hanuman commission alag se (artist par depend).

### 7.3 Lighting aur post-processing (URP)

- **Global Volume:** Tonemapping (ACES), Bloom (mashaal, deep, sona), Color Adjustments (thanda raat ka tone), Vignette (halka), Film grain nahi.
- **Fog:** halka neela exponential fog — door ke mahal dhundhle, depth aaye.
- **Lights:** ek directional (chaand), mashaalen **baked** + har frame mein sirf 2–4 real-time point lights (player ke paas wali). Light Probes + Reflection Probes.
- **Baked GI** — sundar bhi, web par sasta bhi.
- Quality tiers: Desktop (bloom, shadows, zyada lights) aur Mobile (kam shadows, bloom halka, pixel budget 1 MP).

### 7.4 Duniya mein jaan (chhoti cheezein, bada asar)

- Hawa mein hilte jhande aur kapde, udte patte, mashaal ki chingariyaan, chaand ke aage badal.
- Ghoomte pehredaar aapas mein baat karte (bas awaaz), door kutte ka bhaukna.
- Ashok Vatika mein jugnu aur taalaab par chaand ka pratibimb.

### 7.5 UI aur presentation

- Fonts: ek serif/Devanagari-friendly title font + ek saaf sans body font (dono Hindi + English chalaayein, jaise Noto Serif Devanagari / Mukta / Tiro).
- HUD kam se kam: neeche ek shak ka meter (mudrika ke gol frame mein), phal ki ginti, objective ki ek line, aur zarurat par distance marker ("Sita Mata 40 m").
- Kahani: chhote subtitles (Hindi/English toggle), jab Hanuman naye zone mein aayein.
- Menus HTML shell mein (research report section 4) — usi palette aur motif ke saath.

### 7.6 Sound aur music

- **Sound:** Kenney, OpenGameArt (public domain) + Freesound (license dekh kar). Kadam (chhat/mitti/patte alag), mashaal ki chatak, ghanti, pehredaar ki awaazein, shak hone par ek chhoti "sting".
- **Music:** 2–3 tracks — stealth (dheemi, tanpura + halki tabla), Ashok Vatika (shaant, bansuri), dahan (tez, dhol). Suno ya kisi musician se. `stream/` folder mein alag `.m4a` (research report section 7).
- Shak badhne par music ki ek layer tez ho (adaptive music, 2 layer kaafi).

## 8. Technical plan (Unity 6)

- Render pipeline: **URP**. Web build: WebGL 2 pehle (WebGPU baad mein try).
- Input: **Input System** package + On-Screen Stick/Button (phone).
- Camera: **Cinemachine** third-person.
- Player base: Unity ke **Starter Assets – Third Person** se shuru (chalna, kudna, camera already bana hua).
- Pehredaar: waypoints par chalna (NavMesh), vision cone = angle + distance + raycast (deewar ke peeche nahi dikhe).
- Ek hi gameplay scene + ek chhota "Ending" scene. Zone = scene ke andar GameObjects.
- Web shell + bridge + save: research report ka section 11 jaisa hi (`Session.cs`, `Bridge.jslib`, localStorage me checkpoint).

Scripts (sab chhote, ek kaam wale):

| Script | Kaam |
|---|---|
| `Noise.cs` | Daudne/phal girne par ek radius mein "awaaz" event |
| `LightExposure.cs` | Player kitni roshni mein hai (0–1) |
| `GuardPatrol.cs` | Waypoints par ghoomna |
| `GuardSenses.cs` | Vision cone + awaaz sunna → suspicion badhana |
| `Suspicion.cs` | Meter, UI ka rang, pakde jaane par restart |
| `Throwable.cs` | Phal phenkna, arc preview |
| `HideSpot.cs` | Jhaadi mein ghusna/nikalna |
| `Checkpoint.cs` | Deep jalana, save karna |
| `TorchTarget.cs` + `DahanTimer.cs` | Finale |
| `Session.cs` | Web page se baat (pause, music, save, ending) |

## 9. Hafte-wise plan (naye developer ke liye, ~15 hafte, roz 1–2 ghante)

| Hafta | Kaam | "Ho gaya" kab |
|---|---|---|
| 0 | **Unity Learn: "Unity Essentials" + "Junior Programmer"** ke pehle hisse | Ek chhota roll-a-ball khud bana liya |
| 1 | Pipeline test: khaali scene → Web build → Cloudflare par live (research report ka setup) | Phone par link khulta hai |
| 2 | Starter Assets player + Cinemachine + phone joystick | Capsule ghoomta, kudta hai, dono par |
| 3 | ProBuilder se Zone 1–2 ka **grey-box** (sirf dabbe) | Deewar se bazaar tak chal kar pahunch sakte ho |
| 4 | Pehla pehredaar: waypoints + vision cone + suspicion meter | Dikhne par pakde jaate ho, checkpoint par wapas |
| 5 | Roshni/parchhai + daudne ka shor | Parchhai mein der se pakde jaate ho |
| 6 | Phal phenkna + Zone 3 grey-box | Pehredaar ko bhatka kar nikal sakte ho |
| 7 | Jhaadi mein chhupna + Zone 4 + Sita trigger + text cutscene | Mudrika de sakte ho |
| 8 | Zone 5 dahan + timer + ending | **Poora game shuru se ant tak khela ja sakta hai (dabbon mein)** |
| 9 | Web shell: loading, pause, music, save/continue, error screens | Reload ke baad "Continue" chalta hai |
| 10 | Reference board + asset packs chuno aur kharido; Hanuman commission shuru (hafta 1 mein hi artist dhoondhna shuru kar do) | Saare packs ek test scene mein ek style ke lagein |
| 11 | Zone 1–3: dabbe hata kar asli assets; URP Volume, fog, baked lighting | Bazaar ki chhat ka screenshot "game jaisa" lage |
| 12 | Zone 4–5 art; mashaal/aag/chingari VFX; Hanuman model + animations | Dahan dekhne layak |
| 13 | Duniya mein jaan (7.4), HUD, subtitles, opening concept art, fonts | Pehli screen se ant tak ek jaisa look |
| 14 | Sound, adaptive music; phone performance (LOD, instancing, texture compression, quality tiers) | Purane Android par 30 fps, data ~60 MB se kam |
| 15 | 5–10 logon se playtest, fixes, launch | Link share kar diya |

**Sabse zaroori niyam:** hafte 9 tak koi sundar art nahi. Pehle dabbon mein game mazedaar hona chahiye; agar wahan maza nahi, to art se nahi aayega. (Asset packs ki **list** aur Hanuman ke artist ki talaash pehle se shuru kar sakte ho — bas unhe game mein lagana hafte 10 se.)

## 10. Risk aur bachaav

| Risk | Bachaav |
|---|---|
| Unity pehli baar — atak jaana | Hafta 0 skip mat karo; har mechanic ka tutorial dhoondho ("Unity stealth vision cone", "Unity throw arc") |
| Pehredaar AI ulajh jaaye | Sirf ghoomna + dekhna + awaaz ki taraf jaana. Peecha karna (chase) nahi — dikhe to seedha "pakde gaye" |
| Hanuman model na mile / der ho | Artist ki talaash hafta 1 se; tab tak Asset Store wala stylized character; raat aur parchhai mein detail kam dikhti hai |
| Assets ka style mel na khaaye | Ek hi artist/publisher ke packs; reference board se milaao; zarurat ho to sab par ek jaisa color grading |
| Stylized-realistic look phone par slow | Baked lighting, LOD, GPU instancing, compressed textures, sirf 2–4 real-time lights, Mobile quality tier, pixel budget 1 MP |
| Data bahut bada (download lamba) | Texture size 1K/2K tak, unused assets build se bahar, music `stream/` mein; lakshya ~60 MB |
| Scope badhna | Section 4 ki "Demo mein nahi" list ko pakka rakho; naye idea "v2.md" mein likho |
| Dharmik bhavnaayein | Shraddha wala tone, kahani Valmiki/Tulsidas ke kareeb, koi mazaak nahi; ant mein credits/source mention |

## 11. Demo ke baad (v2 ideas — abhi nahi)

- Bada roop: kuch jagah deewar todna / pehredaar ko uthana
- Vibhishan ka mahal (Ram naam likha ghar) — side zone
- Ravan ki sabha — dialogue scene
- Akshay Kumar (Ravan ka putra) se ladaai — pehla combat
- Choodamani le kar wapas samudra paar udna — flight level

## 12. Agla kadam

1. Unity Hub + Unity 6 + Web Build Support install karo.
2. Unity Learn par "Unity Essentials" shuru karo.
3. Hafta 1 ka pipeline test — research report section 11 ke steps se (template, build, Cloudflare).
