import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const killers = [
  { name: "Caça Coroas", imageUrl: "/images/killers/caca-coroas.webp" },
  { name: "Wraith (Espectro)", imageUrl: "/images/killers/wraith.webp" },
  { name: "Hillbilly (Billy)", imageUrl: "/images/killers/hillbilly.webp" },
  { name: "Nurse", imageUrl: "/images/killers/nurse.webp" },
  { name: "Hag (Bruxa)", imageUrl: "/images/killers/hag.webp" },
  { name: "Doctor", imageUrl: "/images/killers/doctor.webp" },
  { name: "Huntress (Caçadora)", imageUrl: "/images/killers/huntress.webp" },
  { name: "Cannibal (Bubba Sawyer)", imageUrl: "/images/killers/cannibal.webp" },
  { name: "Nightmare (Freddy Krueger)", imageUrl: "/images/killers/nightmare.webp" },
  { name: "Pig", imageUrl: "/images/killers/pig.webp" },
  { name: "Clown (Palhaço)", imageUrl: "/images/killers/clown.webp" },
  { name: "Spirit", imageUrl: "/images/killers/spirit.webp" },
  { name: "Legion", imageUrl: "/images/killers/legion.webp" },
  { name: "Plague (Praga)", imageUrl: "/images/killers/plague.webp" },
  { name: "Ghost Face", imageUrl: "/images/killers/ghost-face.webp" },
  { name: "BrenoGorgon", imageUrl: "/images/killers/brenogorgon.webp" },
  { name: "Oni", imageUrl: "/images/killers/oni.webp" },
  { name: "Deathslinger (Mercenário)", imageUrl: "/images/killers/deathslinger.webp" },
  { name: "Executioner (Pyramid Head)", imageUrl: "/images/killers/executioner.webp" },
  { name: "Blight", imageUrl: "/images/killers/blight.webp" },
  { name: "Twins (Gêmeos da compreensão)", imageUrl: "/images/killers/gemeos-da-compreensao.webp" },
  { name: "Trapalisson (Trapaça)", imageUrl: "/images/killers/trapalisson.webp" },
  { name: "Nemesis", imageUrl: "/images/killers/nemesis.webp" },
  { name: "Cenobite", imageUrl: "/images/killers/cenobite.webp" },
  { name: "Artist (Artista)", imageUrl: "/images/killers/artist.webp" },
  { name: "Onryō (Sadako)", imageUrl: "/images/killers/onryo.webp" },
  { name: "Dredge (Draga)", imageUrl: "/images/killers/dredge.webp" },
  { name: "Mastermind (Wesker)", imageUrl: "/images/killers/mastermind.webp" },
  { name: "Knight (Cavaleiro)", imageUrl: "/images/killers/knight.webp" },
  { name: "Singularity (Singularidade)", imageUrl: "/images/killers/singularity.webp" },
  { name: "Xenomorph (Alien)", imageUrl: "/images/killers/xenomorfo.webp" },
  { name: "Good Guy (Chucky)", imageUrl: "/images/killers/good-guy.webp" },
  { name: "Unknown (Desconhecido)", imageUrl: "/images/killers/unknown.webp" },
  { name: "Lich (D&D)", imageUrl: "/images/killers/lich.webp" },
  { name: "Dark Lord (Dracula)", imageUrl: "/images/killers/dark-lord.webp" },
  { name: "Houndmaster (Fran da Matilha)", imageUrl: "/images/killers/mestra-do-grauge.webp" },
  { name: "Shape (Michael Myers)", imageUrl: "/images/killers/shape.webp" },
  { name: "Ghoul (Kaneki)", imageUrl: "/images/killers/kaneki.webp" },
  { name: "Animatronic", imageUrl: "/images/killers/animatronic.webp" },
  { name: "Krasue", imageUrl: "/images/killers/krasue.webp" },
  { name: "Adriana", imageUrl: "/images/killers/adriana.webp" },
  { name: "Vecna (Stranger Things)", imageUrl: "/images/killers/vecna.webp" },
  { name: "Jason", imageUrl: "/images/killers/jason.webp" },
];

const survivors = [
  { name: "Ace Visconti", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/3e/New_Store_Ace.png" },
  { name: "Ada Wong", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/d/d3/New_Store_Ada.png" },
  { name: "Adam Francis", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/05/New_Store_Adam.png" },
  { name: "Aestri Yazar & Baermar Uraz", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/18/Store_Troupe.png" },
  { name: "Alan Wake", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/6/65/New_Store_Alan.png" },
  { name: "Ashley J. Williams", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/4/43/New_Store_Ash.png" },
  { name: "Cheryl Mason", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/7/78/New_Store_Cheryl.png" },
  { name: "Claudette Morel", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/3f/New_Store_Claudette.png" },
  { name: "David King", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f5/New_Store_David.png" },
  { name: "Detective David Tapp", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/7/71/New_Store_Tapp.png" },
  { name: "Dwight Fairfield", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/5c/New_Store_Dwight.png" },
  { name: "Ellen Ripley", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/0f/EllenRipley_Spacesuit_Concept_Art.PNG" },
  { name: "Felix Richter", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/8/88/New_Store_Felix.png" },
  { name: "Feng Min", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/d/d9/New_Store_Feng.png" },
  { name: "Gabriel Soma", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/e1/Store_Gabriel.png" },
  { name: "Haddie Kaur", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/6/65/New_Store_Haddie.png" },
  { name: "Jake Park", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/04/New_Store_Jake.png" },
  { name: "Jane Romero", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f4/New_Store_Jane.png" },
  { name: 'Jeffrey "Jeff" Johansen', imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/7/7d/New_Store_Jeff.png" },
  { name: "Jill Valentine", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/fb/New_Store_Jill.png" },
  { name: "Jonah Vasquez", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/07/New_Store_Jonah.png" },
  { name: "Kate Denson", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/0f/New_Store_Kate.png" },
  { name: "Lara Croft", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/d/da/Store_Lara.png" },
  { name: "Laurie Strode", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/9/90/New_Store_Laurie.png" },
  { name: "Lee Yun-Jin", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/fd/New_Store_Yun-Jin.png" },
  { name: "Leon Scott Kennedy", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/b/b3/New_Store_Leon.png" },
  { name: "Meg Thomas", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/c8/New_Store_Meg.png" },
  { name: "Michonne Grimes", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/a/aa/S47_MichonneGrimes_Portrait.png" },
  { name: "Mikaela Reid", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/e/ed/New_Store_Mikaela.png" },
  { name: "Nancy Wheeler", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/1e/New_Store_Nancy.png" },
  { name: "Nea Karlsson", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/b/ba/New_Store_Nea.png" },
  { name: "Nicolas Cage", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/6/63/New_Store_Nicolas.png" },
  { name: "Quentin Smith", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/31/New_Store_Quentin.png" },
  { name: "Rebecca Chambers", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/c/c3/New_Store_Rebecca.png" },
  { name: "Renato Lyra", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/1/16/Store_Renato.png" },
  { name: "Sable Ward", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f2/Store_Sable_Ward.png" },
  { name: "Steve Harrington", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/0f/New_Store_Steve.png" },
  { name: "Thalita Lyra", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/9/91/Store_Thalita.png" },
  { name: "Trevor Belmont", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/5/56/Store_Trevor.png" },
  { name: "Vee Boonyasak", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/7/77/S49_VeeBoonyasak_Portrait.png" },
  { name: "Vittorio Toscano", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f2/Store_Vittorio.png" },
  { name: 'William "Bill" Overbeck', imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/01/New_Store_Bill.png" },
  { name: "Yoichi Asakawa", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f3/New_Store_Yoichi.png" },
  { name: "Yui Kimura", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/0/0b/New_Store_Yui.png" },
  { name: "Zarina Kassir", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/6/61/New_Store_Zarina.png" },
  { name: "Élodie Rakoto", imageUrl: "https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/3/37/New_Store_Elodie.png" },
];

async function main() {
  console.log("🩸 Seeding DBD killers and survivors...");

  for (const killer of killers) {
    await prisma.killer.upsert({
      where: { name: killer.name },
      update: { imageUrl: killer.imageUrl },
      create: { name: killer.name, imageUrl: killer.imageUrl },
    });
  }

  for (const survivor of survivors) {
    await prisma.survivor.upsert({
      where: { name: survivor.name },
      update: { imageUrl: survivor.imageUrl },
      create: { name: survivor.name, imageUrl: survivor.imageUrl },
    });
  }

  console.log(`✅ Seeded ${killers.length} killers and ${survivors.length} survivors.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
