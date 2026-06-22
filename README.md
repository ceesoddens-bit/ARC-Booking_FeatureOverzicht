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

## Hoe te gebruiken

1. Open het bestand **[arc-booking-feature-overzicht.html](arc-booking-feature-overzicht.html)** direct in een moderne webbrowser (Chrome, Safari, Firefox, Edge).
2. Gebruik de filterknoppen bovenaan de pagina om de weergave te filteren op status.
3. Bekijk de statuskaarten bovenaan voor een directe samenvatting van de voortgang van het project.
