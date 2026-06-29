// Curated ICAR / DAHD / IVRI livestock disease identification & treatment reference.
// Full text ingested via npm run ingest:sarvam-rag from official PDFs and web pages.

export const ICAR_LIVESTOCK_HEALTH = `
# ICAR & DAHD LIVESTOCK DISEASE IDENTIFICATION AND TREATMENT

## Official reference sources (authoritative)
| Source | URL | Use |
|--------|-----|-----|
| ICAR Central Health Key (bovine disease codes, synonyms) | https://www.icar.org/guidelines/icar-central-health-key/ | Symptom-to-disease mapping, clinical terminology |
| DAHD Standard Veterinary Treatment Guidelines 2024 | https://dahd.gov.in/sites/default/files/2024-10/StandardVeterinaryTreatment.pdf | Diagnosis, treatment, biosecurity for all major livestock diseases |
| ICAR-NIVEDI CaDDES (Cattle Disease Diagnosis Expert System) | https://nivedi.res.in/nicra/CaDDES/ | Field diagnosis of 13 cattle diseases by symptoms |
| ICAR Gaushala Management Manual | https://icar.org.in/sites/default/files/2022-06/Gaushala-Booklet_Eng-Oct-2020.pdf | Vaccination, isolation, mastitis testing, rabies post-exposure |
| ICAR Dairy Cattle Health Guidelines | https://www.icar.org/Guidelines/07.1-Functional-traits-Dairy-cattle-health.pdf | Udder health, mastitis, genetic selection for health |
| ICAR Goat Preventive Health Calendar | https://icar.org.in/en/annual-preventive-goat-health-calendar | Annual vaccination/deworming schedule for goats |
| ICAR-IVRI (Indian Veterinary Research Institute) | https://ivri.nic.in/ | Research, extension literature on animal health |

## How to identify illness — farmer checklist (ICAR/DAHD aligned)
1. **Temperature** — normal cattle 38.0–39.3°C; fever often indicates infection.
2. **Appetite & rumination** — reduced eating, drooling, or no cud-chewing suggests digestive or systemic illness.
3. **Milk** — clots, blood, watery or foul milk → mastitis; sudden drop in yield → metabolic or infectious disease.
4. **Udder** — hot, swollen, painful quarter → mastitis; check with strip cup or CMT.
5. **Respiration** — fast breathing, nasal discharge, cough → pneumonia or FMD (mouth lesions too).
6. **Locomotion** — lameness, reluctance to stand → foot problems, milk fever, or joint infection.
7. **Skin** — nodules (LSD), blisters on mouth/feet (FMD), swellings under jaw (HS).
8. **Calving & afterbirth** — retained placenta >12 h, inability to stand after calving → milk fever / metritis risk.

Always call a qualified veterinarian for diagnosis and medicine. Do not self-medicate with human antibiotics.

## Infectious diseases — identification & first response (DAHD SVTG / ICAR)

### Foot and Mouth Disease (FMD)
- **Cause:** FMD virus (serotypes O, A, Asia1 in India).
- **Signs:** High fever, drooling, vesicles/blisters on tongue, lips, mouth, teats, between hooves; lameness; reduced milk.
- **Action:** Isolate immediately; notify veterinarian; vaccinate healthy herd (6-month booster); soft feed; biosecurity — disinfect boots, vehicles.
- **Do not:** Slaughter or move animals; share equipment between farms.

### Haemorrhagic Septicaemia (HS / Galghotu)
- **Cause:** Pasteurella multocida (serotypes B:2, E:2).
- **Signs:** Sudden high fever, swelling under throat/neck, difficulty breathing, death within 24–48 h (especially buffaloes).
- **When:** Outbreaks common in monsoon/humid weather after stress.
- **Prevention:** Annual vaccination before monsoon.
- **Treatment:** Vet-only antibiotics (e.g. ceftiofur, sulphonamides per SVTG); early treatment critical.

### Black Quarter / Blackleg
- **Cause:** Clostridium chauvoei spores in soil.
- **Signs:** Sudden lameness, swollen muscle (often hindquarter), crepitus (gas) in muscle, rapid death in young cattle.
- **Prevention:** Annual vaccination at 6 months + booster.
- **Note:** Notifiable; carcass must not be opened if suspected anthrax/blackleg.

### Anthrax
- **Signs:** Sudden death, bleeding from orifices, bloating; may see high fever and tremors before death.
- **Action:** Do NOT open carcass; notify authorities immediately; burn/bury per SVTG SOP; vaccinate surrounding herd.

### Lumpy Skin Disease (LSD)
- **Cause:** Capripoxvirus (spread by insects).
- **Signs:** Fever, skin nodules (2–5 cm), nasal/ocular discharge, reduced milk, emaciation in severe cases.
- **Action:** Isolate; control flies/ticks; supportive care; vaccination where available; report to vet.

### Brucellosis
- **Signs:** Abortion (especially 5–7 months), retained placenta, infertility, reduced milk; no obvious signs in many carriers.
- **Prevention:** Vaccinate heifer calves 4–8 months (S19); test and cull positive animals in organized herds.
- **Human risk:** Can cause undulant fever in humans — handle aborted material with gloves.

### Mastitis (udder inflammation)
- **Clinical:** Hot swollen quarter, painful udder, abnormal milk (clots, blood, watery).
- **Subclinical:** Normal-looking udder but high somatic cell count — detect by CMT or milk testing.
- **Prevention:** Pre- and post-milking teat dipping, clean dry bedding, milk mastitis cows last, dry-cow therapy per vet.
- **Treatment:** Antibiotic intramammary or systemic per vet; discard milk during withdrawal period.

### Bloat (tympany)
- **Free-gas bloat:** Left flank distended tight; animal distressed, difficulty breathing.
- **Frothy bloat:** After lush legume/grain; foam traps gas.
- **First aid:** Walk animal; drench with vegetable oil (frothy); emergency trocar/rumen puncture by vet if severe.

### Milk fever (hypocalcaemia)
- **When:** Within 72 h of calving (high-yield cows).
- **Signs:** Weakness, unable to stand, cold ears, bloated appearance, often alert.
- **Emergency:** Call vet for IV calcium borogluconate immediately; do not force to stand.

### Repeat breeding / anoestrus
- **Causes:** Poor nutrition, mineral deficiency (P, Cu, Se), uterine infection, brucellosis, heat stress.
- **Action:** Body condition scoring; mineral supplementation; vet exam for uterine pathology; timed AI after heat detection.

### Calf scours (diarrhoea)
- **Signs:** Loose/watery faeces, dehydration, sunken eyes, weak calf.
- **Action:** ORS/electrolytes; continue feeding milk; isolate; vet if bloody or persistent — may need antibiotics.

### Rabies (after dog/bat bite)
- **Signs:** Behaviour change, excessive salivation, paralysis, death.
- **Post-exposure (Gaushala manual):** Wash wound; vet vaccination course at 0, 3, 14, 28, 90 days if biting animal suspected rabid.

## Vaccination calendar (Indian dairy cattle — ICAR/NDDB standard)
| Disease | First dose | Booster |
|---------|-----------|---------|
| FMD | 4 months | Every 6 months |
| HS | 6 months | Annual, before monsoon |
| Black Quarter (BQ) | 6 months | Annual |
| Brucellosis (heifers only) | 4–8 months | Once (S19 vaccine) |
| Theileriosis | As per local vet advice | Endemic areas |

## ICAR Central Health Key — major bovine disease categories
Organ systems covered: skin; cardiovascular; respiratory; digestive (bloat, acidosis, hardware disease, abomasal displacement); urinary; locomotory/claws; nervous/sensory; udder; mastitis; reproduction (anoestrus, dystocia, retained placenta, metritis).

Common digestive codes farmers ask about:
- **Bloat / tympany (1.07.10.07):** rumen distension — free gas or frothy foam.
- **Acidosis (1.07.10.06):** grain overload, low rumen pH, diarrhoea, laminitis.
- **Hardware disease (1.07.10.12):** wire/nail in reticulum — pain, reduced rumination, fever.
- **Left displaced abomasum (1.07.12.05.01):** high-yield cow after calving, ketosis risk, "ping" on left flank.

## CaDDES — 13 cattle diseases covered by ICAR-NIVEDI expert system
Field veterinarians use symptom scoring for: mastitis, FMD, HS, anthrax, blackleg, babesiosis, theileriosis, rabies, milk fever, bloat, diarrhoea, pneumonia, and repeat breeding related conditions. Web tool: https://nivedi.res.in/nicra/CaDDES/

## When to call the veterinarian urgently
- Animal cannot stand (milk fever, nerve injury, severe infection)
- Difficulty breathing or severe bloat
- Sudden death in herd or bleeding from nose/mouth
- Vesicles in mouth or on feet (FMD suspicion)
- Prolapse, retained placenta >12 hours, dystocia
- Any notifiable disease suspicion — do not delay reporting

Treatment doses and specific drugs must follow DAHD SVTG under veterinary supervision only.
`;
