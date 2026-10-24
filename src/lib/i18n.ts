export type Lang = "en" | "sl";

export const LANG_COOKIE = "lang";
export const DEFAULT_LANG: Lang = "en";

export const translations = {
  en: {
    brand: "Portfolio",
    nav: {
      home: "Home",
      projects: "Projects",
      about: "About",
      services: "Services",
      files: "Files",
      contact: "Contact",
      donate: "Support",
    },
    home: {
      heroTitle: "Hi, I build things for the web & beyond.",
      heroSubtitle:
        "Full-stack developer, Android tinkerer, and LEGO builder. I design fast, beautiful digital products and help others do the same.",
      heroCta: "See my work",
      heroCta2: "Hire me",
      featuredTitle: "Featured projects",
      featuredSubtitle: "A selection of recent apps, builds and experiments.",
      viewAll: "View all projects",
      servicesTitle: "What I can do for you",
      servicesSubtitle:
        "From idea to production — clean code, modern stack, delivered on time.",
      statsDev: "Apps shipped",
      statsYears: "Years coding",
      statsClients: "Happy clients",
      statsCoffee: "Coffees brewed",
    },
    projects: {
      title: "Projects",
      subtitle:
        "Android apps, LEGO creations, web experiments and open-source work.",
      filterAll: "All",
      filterAndroid: "Android",
      filterLego: "LEGO",
      filterWeb: "Web",
      filterOther: "Other",
      visit: "Visit",
      code: "Source",
      backToProjects: "← All projects",
      noProjects: "No projects yet — check back soon.",
      commentsTitle: "Comments",
      commentName: "Your name",
      commentEmail: "Email (optional)",
      commentBody: "Leave a comment…",
      commentSubmit: "Post comment",
      commentPosting: "Posting…",
      commentSuccess: "Thanks! Your comment was posted.",
      commentError: "Could not post comment. Please try again.",
    },
    about: {
      title: "About me",
      subtitle:
        "A little about the person behind the code, the bricks and the ideas.",
      paragraph1:
        "I'm a developer who loves turning ideas into real, useful products. My day job is building web and mobile apps; my evenings are often spent snapping LEGO bricks together or sketching the next side project.",
      paragraph2:
        "I care about performance, accessibility and delightful details. I believe a great product is 10% code and 90% empathy for the person using it.",
      paragraph3:
        "When I'm not at the keyboard, you'll find me hiking, brewing coffee, or contributing to open-source projects.",
      skillsTitle: "Tools & skills",
      galleryTitle: "A few snapshots",
      galleryHint: "Drop your own photos into /public/gallery and they will appear here.",
    },
    services: {
      title: "Services",
      subtitle:
        "Need a website, an app or a custom piece of software? Here's how I can help.",
      startingAt: "from",
      getQuote: "Request a quote",
      whyTitle: "Why work with me",
      why1Title: "Fast delivery",
      why1: "Modern stack, proven workflow, shipped in weeks — not months.",
      why2Title: "Pixel-perfect",
      why2: "Design and engineering happen together. No hand-off gaps.",
      why3Title: "Built to last",
      why3: "Clean code, tests, docs. You own everything.",
    },
    files: {
      title: "Files",
      subtitle:
        "Free downloads of resources, templates and assets. Uploads are password-protected.",
      downloadsTitle: "Downloads",
      noFiles: "No files yet. Check back soon.",
      download: "Download",
      size: "Size",
      added: "Added",
      uploadTitle: "Upload (protected)",
      uploadHint: "Uploads require a password. Downloads are open to everyone.",
      password: "Password",
      unlock: "Unlock uploader",
      unlocked: "Uploader unlocked",
      wrongPassword: "Wrong password.",
      selectFile: "Choose file",
      description: "Short description (optional)",
      upload: "Upload file",
      uploading: "Uploading…",
      uploadSuccess: "File uploaded!",
      uploadError: "Upload failed.",
      driveTitle: "From my Google Drive",
      driveSubtitle:
        "Curated files synced from a specific Google Drive folder.",
      driveNotConfigured:
        "Google Drive sync is not configured yet. Add GOOGLE_DRIVE_API_KEY and GOOGLE_DRIVE_FOLDER_ID in .env.",
      driveOpen: "Open in Drive",
    },
    contact: {
      title: "Get in touch",
      subtitle:
        "Have a project in mind, or just want to say hi? Drop a message.",
      name: "Name",
      email: "Email",
      subject: "Subject",
      message: "Message",
      send: "Send message",
      sending: "Sending…",
      success: "Thanks! I'll get back to you soon.",
      error: "Something went wrong. Please try again.",
    },
    donate: {
      title: "Support my work",
      subtitle:
        "If any of my projects or open-source work helped you, consider buying me a coffee.",
      coffee: "Buy me a coffee",
      coffeeHint:
        "Connect your Buy Me a Coffee / Ko-fi link in /src/lib/site.ts",
      thanks: "Every bit helps and means a lot — thank you!",
      ossTitle: "Open source",
      ossSubtitle:
        "A place to highlight open-source projects you can star, contribute to, or sponsor.",
      star: "Star on GitHub",
    },
    footer: {
      tagline: "Built with care. Hosted on Cloudflare.",
      rights: "All rights reserved.",
      builtWith: "Built with Next.js, Tailwind and ❤️",
    },
    common: {
      readMore: "Read more",
      learnMore: "Learn more",
      loading: "Loading…",
      switchLang: "Slovenščina",
      backHome: "Back home",
    },
    categories: {
      android: "Android",
      lego: "LEGO",
      web: "Web",
      other: "Other",
    },
  },
  sl: {
    brand: "Portfelj",
    nav: {
      home: "Domov",
      projects: "Projekti",
      about: "O meni",
      services: "Storitve",
      files: "Datoteke",
      contact: "Kontakt",
      donate: "Podpora",
    },
    home: {
      heroTitle: "Živjo, gradim stvari za splet in širše.",
      heroSubtitle:
        "Full-stack razvijalec, Android eksperimentator in LEGO graditelj. Oblikujem hitre, lepe digitalne izdelke in pri tem pomagam tudi drugim.",
      heroCta: "Poglej moje delo",
      heroCta2: "Najemite me",
      featuredTitle: "Izpostavljeni projekti",
      featuredSubtitle: "Izbor nedavnih aplikacij, gradenj in eksperimentov.",
      viewAll: "Vsi projekti",
      servicesTitle: "Kaj lahko naredim zate",
      servicesSubtitle:
        "Od ideje do produkcije — čista koda, moderen sklad, pravočasno.",
      statsDev: "Aplikacij",
      statsYears: "Let kodiranja",
      statsClients: "Zadovoljnih strank",
      statsCoffee: "Skuhanih kav",
    },
    projects: {
      title: "Projekti",
      subtitle:
        "Android aplikacije, LEGO stvaritve, spletni eksperimenti in odprtokodni projekti.",
      filterAll: "Vse",
      filterAndroid: "Android",
      filterLego: "LEGO",
      filterWeb: "Splet",
      filterOther: "Drugo",
      visit: "Obišči",
      code: "Koda",
      backToProjects: "← Vsi projekti",
      noProjects: "Še ni projektov — kmalu.",
      commentsTitle: "Komentarji",
      commentName: "Tvoje ime",
      commentEmail: "E-mail (neobvezno)",
      commentBody: "Napiši komentar…",
      commentSubmit: "Objavi komentar",
      commentPosting: "Objavljam…",
      commentSuccess: "Hvala! Tvoj komentar je objavljen.",
      commentError: "Komentarja ni bilo mogoče objaviti.",
    },
    about: {
      title: "O meni",
      subtitle:
        "Nekaj besed o osebi za kodo, kockami in idejami.",
      paragraph1:
        "Sem razvijalec, ki rad spreminja ideje v uporabne izdelke. Podnevi gradim spletne in mobilne aplikacije, zvečer pa pogosto sestavljam LEGO kocke ali rišem naslednji stranski projekt.",
      paragraph2:
        "Pomembne so mi zmogljivost, dostopnost in prijetne malenkosti. Verjamem, da je dober izdelek 10 % kode in 90 % empatije do uporabnika.",
      paragraph3:
        "Ko nisem za tipkovnico, me najdeš v hribih, pri kuhanju kave ali med prispevanjem k odprtokodnim projektom.",
      skillsTitle: "Orodja in veščine",
      galleryTitle: "Nekaj utrinkov",
      galleryHint: "Svoje fotografije dodaj v /public/gallery in prikazale se bodo tukaj.",
    },
    services: {
      title: "Storitve",
      subtitle:
        "Potrebuješ spletno stran, aplikacijo ali program po meri? Tukaj lahko pomagam.",
      startingAt: "od",
      getQuote: "Povpraševanje",
      whyTitle: "Zakaj sodelovati z mano",
      why1Title: "Hitra izvedba",
      why1: "Moderen sklad, preverjen proces, izdelek v tednih — ne mesecih.",
      why2Title: "Do pikice natančno",
      why2: "Oblikovanje in razvoj gresta z roko v roki. Brez vrzeli.",
      why3Title: "Narejeno za dlje časa",
      why3: "Čista koda, testi, dokumentacija. Vse je tvoje.",
    },
    files: {
      title: "Datoteke",
      subtitle:
        "Brezplačni prenosi virov, predlog in materialov. Nalaganje je zaščiteno z geslom.",
      downloadsTitle: "Prenosi",
      noFiles: "Še ni datotek. Pokukaj kasneje.",
      download: "Prenesi",
      size: "Velikost",
      added: "Dodano",
      uploadTitle: "Nalaganje (zaščiteno)",
      uploadHint:
        "Za nalaganje je potrebno geslo. Prenosi so odprti za vse.",
      password: "Geslo",
      unlock: "Odkleni nalagalnik",
      unlocked: "Nalagalnik odklenjen",
      wrongPassword: "Napačno geslo.",
      selectFile: "Izberi datoteko",
      description: "Kratek opis (neobvezno)",
      upload: "Naloži datoteko",
      uploading: "Nalagam…",
      uploadSuccess: "Datoteka naložena!",
      uploadError: "Nalaganje ni uspelo.",
      driveTitle: "Iz mojega Google Drive",
      driveSubtitle:
        "Izbrane datoteke iz sinhronizirane mape na Google Drive.",
      driveNotConfigured:
        "Sinhronizacija z Google Drive še ni nastavljena. Dodaj GOOGLE_DRIVE_API_KEY in GOOGLE_DRIVE_FOLDER_ID v .env.",
      driveOpen: "Odpri v Drive",
    },
    contact: {
      title: "Stopi v stik",
      subtitle: "Imaš idejo ali samo želiš pozdraviti? Pusti sporočilo.",
      name: "Ime",
      email: "E-mail",
      subject: "Zadeva",
      message: "Sporočilo",
      send: "Pošlji sporočilo",
      sending: "Pošiljam…",
      success: "Hvala! Kmalu se oglasim.",
      error: "Nekaj je šlo narobe. Poskusi znova.",
    },
    donate: {
      title: "Podpri moje delo",
      subtitle:
        "Če ti je kateri od projektov ali odprtokodnih prispevkov pomagal, me časti s kavo.",
      coffee: "Časti me s kavo",
      coffeeHint:
        "Svojo Buy Me a Coffee / Ko-fi povezavo nastavi v /src/lib/site.ts",
      thanks: "Vsak prispevek pomaga in veliko pomeni — hvala!",
      ossTitle: "Odprta koda",
      ossSubtitle:
        "Prostor za izpostavitev odprtokodnih projektov, ki jim lahko daš zvezdico ali prispevaš.",
      star: "Zvezdica na GitHubu",
    },
    footer: {
      tagline: "Zgrajeno s skrbnostjo. Gostuje na Cloudflare.",
      rights: "Vse pravice pridržane.",
      builtWith: "Zgrajeno z Next.js, Tailwind in ❤️",
    },
    common: {
      readMore: "Preberi več",
      learnMore: "Več",
      loading: "Nalagam…",
      switchLang: "English",
      backHome: "Nazaj domov",
    },
    categories: {
      android: "Android",
      lego: "LEGO",
      web: "Splet",
      other: "Drugo",
    },
  },
} as const;

export type Translation = {
  brand: string;
  nav: { home: string; projects: string; about: string; services: string; files: string; contact: string; donate: string };
  home: { heroTitle: string; heroSubtitle: string; heroCta: string; heroCta2: string; featuredTitle: string; featuredSubtitle: string; viewAll: string; servicesTitle: string; servicesSubtitle: string; statsDev: string; statsYears: string; statsClients: string; statsCoffee: string };
  projects: { title: string; subtitle: string; filterAll: string; filterAndroid: string; filterLego: string; filterWeb: string; filterOther: string; visit: string; code: string; backToProjects: string; noProjects: string; commentsTitle: string; commentName: string; commentEmail: string; commentBody: string; commentSubmit: string; commentPosting: string; commentSuccess: string; commentError: string };
  about: { title: string; subtitle: string; paragraph1: string; paragraph2: string; paragraph3: string; skillsTitle: string; galleryTitle: string; galleryHint: string };
  services: { title: string; subtitle: string; startingAt: string; getQuote: string; whyTitle: string; why1Title: string; why1: string; why2Title: string; why2: string; why3Title: string; why3: string };
  files: { title: string; subtitle: string; downloadsTitle: string; noFiles: string; download: string; size: string; added: string; uploadTitle: string; uploadHint: string; password: string; unlock: string; unlocked: string; wrongPassword: string; selectFile: string; description: string; upload: string; uploading: string; uploadSuccess: string; uploadError: string; driveTitle: string; driveSubtitle: string; driveNotConfigured: string; driveOpen: string };
  contact: { title: string; subtitle: string; name: string; email: string; subject: string; message: string; send: string; sending: string; success: string; error: string };
  donate: { title: string; subtitle: string; coffee: string; coffeeHint: string; thanks: string; ossTitle: string; ossSubtitle: string; star: string };
  footer: { tagline: string; rights: string; builtWith: string };
  common: { readMore: string; learnMore: string; loading: string; switchLang: string; backHome: string };
  categories: { android: string; lego: string; web: string; other: string };
};
