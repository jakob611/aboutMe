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
      heroTitle: "Code, screens, and a few bricks.",
      heroSubtitle:
        "I'm Jakob. This is where I collect my Android and web projects, LEGO builds, and the ideas in between.",
      heroCta: "See my work",
      heroCta2: "Have a project in mind?",
      featuredTitle: "From the workbench",
      featuredSubtitle: "A closer look at the things I've been making.",
      viewAll: "View all projects",
      servicesTitle: "Something we could build together",
      servicesSubtitle:
        "A website, an Android idea, or an existing project that needs some attention. Let's start with what you need.",
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
      noProjects:
        "I'm putting the project notes together. You can explore my code on GitHub in the meantime.",
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
        "I'm Jakob. I like making things that I can put to use, take apart, and improve.",
      paragraph1:
        "This website brings together the things I'm working on: Android apps, websites, and LEGO builds. Some are software, some are physical, and each gives me something different to figure out.",
      paragraph2:
        "I like the part where an idea starts becoming something you can actually try. A first screen, a working feature, a shape made from a handful of bricks. Then comes the useful question: what would make it better?",
      paragraph3:
        "The projects section is where I share that work. If something there connects with an idea of your own, send me a message. A short description of what you have in mind is a good place to start.",
      skillsTitle: "Tools in the workshop",
      galleryTitle: "Away from the screen",
      galleryHint: "A few details from the physical side of making things.",
    },
    services: {
      title: "Services",
      subtitle:
        "Android apps, websites, and AI-assisted workflows. Here's what I can help you build or improve.",
      startingAt: "from",
      getQuote: "Request a quote",
      whyTitle: "A straightforward way to start",
      why1Title: "Talk through the idea",
      why1: "What should it do, who is it for, and what already exists? A short outline is enough to begin.",
      why2Title: "Agree on a useful first step",
      why2: "Decide what belongs in the first version and what can wait. Scope, timing and cost should be clear before work starts.",
      why3Title: "Build, try, and improve",
      why3: "Use a working version to see what feels right and what needs another pass.",
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
      driveNotConfigured: "There are no shared Drive files here yet.",
      driveOpen: "Open in Drive",
    },
    contact: {
      title: "Let's talk about it.",
      subtitle:
        "A project idea, a question about something I've made, or just a hello. It all starts here.",
      name: "Name",
      email: "Email",
      subject: "Subject",
      message: "Message",
      send: "Send message",
      sending: "Sending…",
      success: "Message sent. Thanks for getting in touch.",
      error: "Something went wrong. Please try again.",
    },
    donate: {
      title: "Support my work",
      subtitle:
        "Trying a project, sharing an idea, or pointing out a bug all help move things along.",
      coffee: "Buy me a coffee",
      coffeeHint:
        "Only give if you'd like to. Useful feedback is always welcome too.",
      thanks: "Thanks for taking an interest in what I'm making.",
      ossTitle: "Open source",
      ossSubtitle:
        "A look at the code behind the projects. Questions, suggestions and contributions are welcome.",
      star: "Star on GitHub",
    },
    footer: {
      tagline: "Android, web and LEGO. One project at a time.",
      rights: "All rights reserved.",
      builtWith: "Made by Jakob Tominc",
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
      heroTitle: "Koda, zasloni in nekaj kock.",
      heroSubtitle:
        "Sem Jakob. Tukaj zbiram svoje Android in spletne projekte, LEGO stvaritve ter ideje, ki nastajajo vmes.",
      heroCta: "Poglej moje delo",
      heroCta2: "Imaš idejo za projekt?",
      featuredTitle: "Z delovne mize",
      featuredSubtitle: "Podrobnejši pogled na stvari, ki jih ustvarjam.",
      viewAll: "Vsi projekti",
      servicesTitle: "Kaj lahko ustvariva skupaj",
      servicesSubtitle:
        "Spletna stran, ideja za Android aplikacijo ali obstoječi projekt, ki potrebuje nekaj pozornosti. Začniva pri tem, kar potrebuješ.",
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
      noProjects:
        "Zapiske o projektih še pripravljam. Medtem lahko mojo kodo raziščeš na GitHubu.",
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
        "Sem Jakob. Rad ustvarjam stvari, ki jih lahko uporabim, razstavim in izboljšam.",
      paragraph1:
        "Na tej strani zbiram stvari, s katerimi se ukvarjam: Android aplikacije, spletne strani in LEGO stvaritve. Nekatere živijo na zaslonu, druge na mizi. Pri vsaki se najde nekaj novega za razvozlati.",
      paragraph2:
        "Všeč mi je trenutek, ko ideja postane nekaj, kar lahko preizkusiš. Prvi zaslon, delujoča funkcija ali oblika iz nekaj kock. Potem pride uporabno vprašanje: kako bi bilo lahko še boljše?",
      paragraph3:
        "V razdelku s projekti delim to delo. Če se kaj od tega poveže s tvojo idejo, mi piši. Za začetek zadošča kratek opis tega, kar imaš v mislih.",
      skillsTitle: "Orodja na delovni mizi",
      galleryTitle: "Stran od zaslona",
      galleryHint: "Nekaj podrobnosti s fizične strani ustvarjanja.",
    },
    services: {
      title: "Storitve",
      subtitle:
        "Android aplikacije, spletne strani in delovni postopki s pomočjo umetne inteligence. Tukaj lahko pomagam pri izdelavi ali izboljšavah.",
      startingAt: "od",
      getQuote: "Povpraševanje",
      whyTitle: "Preprost začetek sodelovanja",
      why1Title: "Pogovor o ideji",
      why1: "Kaj naj naredi, komu je namenjeno in kaj že obstaja? Za začetek zadošča kratek opis.",
      why2Title: "Dogovor o prvem koraku",
      why2: "Določiva, kaj sodi v prvo različico in kaj lahko počaka. Obseg, čas in cena morajo biti jasni pred začetkom dela.",
      why3Title: "Izdelava, preizkus in izboljšave",
      why3: "Ob delujoči različici se najlažje vidi, kaj je dobro in kaj potrebuje še en krog popravkov.",
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
      uploadHint: "Za nalaganje je potrebno geslo. Prenosi so odprti za vse.",
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
      driveSubtitle: "Izbrane datoteke iz sinhronizirane mape na Google Drive.",
      driveNotConfigured: "Tukaj še ni deljenih datotek iz Google Drive.",
      driveOpen: "Odpri v Drive",
    },
    contact: {
      title: "Pogovoriva se.",
      subtitle:
        "Ideja za projekt, vprašanje o mojem delu ali samo pozdrav. Tukaj je prostor za vse to.",
      name: "Ime",
      email: "E-mail",
      subject: "Zadeva",
      message: "Sporočilo",
      send: "Pošlji sporočilo",
      sending: "Pošiljam…",
      success: "Sporočilo je poslano. Hvala, da si se oglasil.",
      error: "Nekaj je šlo narobe. Poskusi znova.",
    },
    donate: {
      title: "Podpri moje delo",
      subtitle:
        "Preizkus projekta, nova ideja ali opozorilo na napako pomagajo pri naslednjem koraku.",
      coffee: "Časti me s kavo",
      coffeeHint:
        "Prispevaj le, če želiš. Vedno je dobrodošla tudi uporabna povratna informacija.",
      thanks: "Hvala za zanimanje za stvari, ki jih ustvarjam.",
      ossTitle: "Odprta koda",
      ossSubtitle:
        "Pogled v kodo za projekti. Vprašanja, predlogi in prispevki so dobrodošli.",
      star: "Zvezdica na GitHubu",
    },
    footer: {
      tagline: "Android, splet in LEGO. Projekt za projektom.",
      rights: "Vse pravice pridržane.",
      builtWith: "Ustvaril Jakob Tominc",
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
  nav: {
    home: string;
    projects: string;
    about: string;
    services: string;
    files: string;
    contact: string;
    donate: string;
  };
  home: {
    heroTitle: string;
    heroSubtitle: string;
    heroCta: string;
    heroCta2: string;
    featuredTitle: string;
    featuredSubtitle: string;
    viewAll: string;
    servicesTitle: string;
    servicesSubtitle: string;
    statsDev: string;
    statsYears: string;
    statsClients: string;
    statsCoffee: string;
  };
  projects: {
    title: string;
    subtitle: string;
    filterAll: string;
    filterAndroid: string;
    filterLego: string;
    filterWeb: string;
    filterOther: string;
    visit: string;
    code: string;
    backToProjects: string;
    noProjects: string;
    commentsTitle: string;
    commentName: string;
    commentEmail: string;
    commentBody: string;
    commentSubmit: string;
    commentPosting: string;
    commentSuccess: string;
    commentError: string;
  };
  about: {
    title: string;
    subtitle: string;
    paragraph1: string;
    paragraph2: string;
    paragraph3: string;
    skillsTitle: string;
    galleryTitle: string;
    galleryHint: string;
  };
  services: {
    title: string;
    subtitle: string;
    startingAt: string;
    getQuote: string;
    whyTitle: string;
    why1Title: string;
    why1: string;
    why2Title: string;
    why2: string;
    why3Title: string;
    why3: string;
  };
  files: {
    title: string;
    subtitle: string;
    downloadsTitle: string;
    noFiles: string;
    download: string;
    size: string;
    added: string;
    uploadTitle: string;
    uploadHint: string;
    password: string;
    unlock: string;
    unlocked: string;
    wrongPassword: string;
    selectFile: string;
    description: string;
    upload: string;
    uploading: string;
    uploadSuccess: string;
    uploadError: string;
    driveTitle: string;
    driveSubtitle: string;
    driveNotConfigured: string;
    driveOpen: string;
  };
  contact: {
    title: string;
    subtitle: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    send: string;
    sending: string;
    success: string;
    error: string;
  };
  donate: {
    title: string;
    subtitle: string;
    coffee: string;
    coffeeHint: string;
    thanks: string;
    ossTitle: string;
    ossSubtitle: string;
    star: string;
  };
  footer: { tagline: string; rights: string; builtWith: string };
  common: {
    readMore: string;
    learnMore: string;
    loading: string;
    switchLang: string;
    backHome: string;
  };
  categories: { android: string; lego: string; web: string; other: string };
};
