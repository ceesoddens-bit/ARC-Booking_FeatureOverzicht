# ARC Booking — Feature Overzicht

Dit project bevat een interactief en visueel overzicht van de geplande en geïmplementeerde features voor de applicatie **ARC Booking**. Het geeft een duidelijk inzicht in de status en prioriteit van alle verschillende modules en testcases.

## Projectinhoud

Het project bestaat uit een standalone, interactief HTML-dashboard:
* **[arc-booking-feature-overzicht.html](arc-booking-feature-overzicht.html)**: Een interactieve pagina die alle features categoriseert per module, statistieken live berekent en filteropties biedt om snel de status van specifieke onderdelen te bekijken (zoals "Live", "Moet getest", "Bekende bugs", "In ontwikkeling", en "Nog te bouwen").

### Gedekte Modules

1. **🔐 Authenticatie & Toegang** — Login, registratie, multi-tenant isolatie, wachtwoord vergeten flows.
2. **🏪 Restaurantprofiel & Instellingen** — Openingstijden, capaciteit per tijdslot, branding, privacy.
3. **📅 Reserveringen (Kern)** — Boekingswidget (gastzijde), dashboard (restaurantzijde), voorkomen van dubbelboekingen, annuleringen.
4. **🗓 Beschikbaarheid & Agenda** — Agenda-overzicht per dag/week/maand, bufferslots, real-time updates.
5. **📧 E-mail Notificaties** — Bevestigingsmails, herinneringen, SPF/DKIM verificatie, annuleringslinks.
6. **💳 Stripe & Abonnementen** — Gratis proefperiode, betaalde abonnementen, Stripe webhooks, opzeggingen.
7. **🔌 Boekingswidget** — Embeddable widget voor restaurants.

## Functionaliteiten

* **Interactieve Filters**: Bekijk de status van specifieke onderdelen (zoals "Live", "Moet getest", "Bekende bugs", "In ontwikkeling", en "Nog te bouwen").
* **Tijdschatting (Uren)**: Vul voor elke feature de geschatte ontwikkeltijd (in uren) in.
* **Totale Ontwikkeltijd**: De totale geschatte tijd wordt automatisch live bijgehouden en getoond in een statistiek-kaart bovenaan.
* **LocalStorage persistence**: De ingevulde uren worden automatisch opgeslagen in je browser (`localStorage`), zodat ze behouden blijven bij het herladen van de pagina.

## Hoe te gebruiken

### 1. Lokaal openen via Dev Server (Aanbevolen)
Installeer de dependencies en start de server:
```bash
npm install
npm run dev
```
Dit start een dev server en opent automatisch de pagina op [http://localhost:8080/arc-booking-feature-overzicht.html](http://localhost:8080/arc-booking-feature-overzicht.html).

### 2. Direct openen
Je kunt ook het bestand **[arc-booking-feature-overzicht.html](arc-booking-feature-overzicht.html)** direct openen in een moderne webbrowser door erop te dubbelklikken.

