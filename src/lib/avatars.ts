import m1 from "@/assets/avatars/m1.jpg";
import m2 from "@/assets/avatars/m2.jpg";
import m3 from "@/assets/avatars/m3.jpg";
import m4 from "@/assets/avatars/m4.jpg";
import m5 from "@/assets/avatars/m5.jpg";
import m6 from "@/assets/avatars/m6.jpg";
import m7 from "@/assets/avatars/m7.jpg";
import m8 from "@/assets/avatars/m8.jpg";
import m9 from "@/assets/avatars/m9.jpg";
import m10 from "@/assets/avatars/m10.jpg";
import f1 from "@/assets/avatars/f1.jpg";
import f2 from "@/assets/avatars/f2.jpg";
import f3 from "@/assets/avatars/f3.jpg";
import f4 from "@/assets/avatars/f4.jpg";
import f5 from "@/assets/avatars/f5.jpg";
import f6 from "@/assets/avatars/f6.jpg";
import f7 from "@/assets/avatars/f7.jpg";
import f8 from "@/assets/avatars/f8.jpg";
import f9 from "@/assets/avatars/f9.jpg";
import f10 from "@/assets/avatars/f10.jpg";
import ab1 from "@/assets/avatars/ab1.jpg";
import ab2 from "@/assets/avatars/ab2.jpg";
import ab3 from "@/assets/avatars/ab3.jpg";
import ab4 from "@/assets/avatars/ab4.jpg";
import ab5 from "@/assets/avatars/ab5.jpg";
import ab6 from "@/assets/avatars/ab6.jpg";
import ab7 from "@/assets/avatars/ab7.jpg";
import ab8 from "@/assets/avatars/ab8.jpg";
import ab9 from "@/assets/avatars/ab9.jpg";
import ab10 from "@/assets/avatars/ab10.jpg";
import ag1 from "@/assets/avatars/ag1.jpg";
import ag2 from "@/assets/avatars/ag2.jpg";
import ag3 from "@/assets/avatars/ag3.jpg";
import ag4 from "@/assets/avatars/ag4.jpg";
import ag5 from "@/assets/avatars/ag5.jpg";
import ag6 from "@/assets/avatars/ag6.jpg";
import ag7 from "@/assets/avatars/ag7.jpg";
import ag8 from "@/assets/avatars/ag8.jpg";
import ag9 from "@/assets/avatars/ag9.jpg";
import ag10 from "@/assets/avatars/ag10.jpg";

export type AvatarStyle = "trainer" | "anime";
export type AvatarOption = {
  id: string;
  url: string;
  label: string;
  gender: "male" | "female";
  style: AvatarStyle;
};

export const avatars: AvatarOption[] = [
  // Trainer (Dynamons-style)
  { id: "m1", url: m1, label: "Storm Trainer", gender: "male", style: "trainer" },
  { id: "m2", url: m2, label: "Frost Trainer", gender: "male", style: "trainer" },
  { id: "m3", url: m3, label: "Ember Trainer", gender: "male", style: "trainer" },
  { id: "m4", url: m4, label: "Leaf Druid", gender: "male", style: "trainer" },
  { id: "m5", url: m5, label: "Shadow Rogue", gender: "male", style: "trainer" },
  { id: "m6", url: m6, label: "Gold Knight", gender: "male", style: "trainer" },
  { id: "m7", url: m7, label: "Earth Warden", gender: "male", style: "trainer" },
  { id: "m8", url: m8, label: "Tide Caller", gender: "male", style: "trainer" },
  { id: "m9", url: m9, label: "Diamond Lord", gender: "male", style: "trainer" },
  { id: "m10", url: m10, label: "Spirit Walker", gender: "male", style: "trainer" },
  { id: "f1", url: f1, label: "Storm Trainer", gender: "female", style: "trainer" },
  { id: "f2", url: f2, label: "Frost Trainer", gender: "female", style: "trainer" },
  { id: "f3", url: f3, label: "Ember Trainer", gender: "female", style: "trainer" },
  { id: "f4", url: f4, label: "Leaf Druid", gender: "female", style: "trainer" },
  { id: "f5", url: f5, label: "Shadow Rogue", gender: "female", style: "trainer" },
  { id: "f6", url: f6, label: "Gold Queen", gender: "female", style: "trainer" },
  { id: "f7", url: f7, label: "Earth Warden", gender: "female", style: "trainer" },
  { id: "f8", url: f8, label: "Tide Caller", gender: "female", style: "trainer" },
  { id: "f9", url: f9, label: "Diamond Lady", gender: "female", style: "trainer" },
  { id: "f10", url: f10, label: "Spirit Walker", gender: "female", style: "trainer" },
  // Anime boys
  { id: "ab1", url: ab1, label: "Ember Ace", gender: "male", style: "anime" },
  { id: "ab2", url: ab2, label: "Tide Knight", gender: "male", style: "anime" },
  { id: "ab3", url: ab3, label: "Volt Striker", gender: "male", style: "anime" },
  { id: "ab4", url: ab4, label: "Verdant Sage", gender: "male", style: "anime" },
  { id: "ab5", url: ab5, label: "Void Hunter", gender: "male", style: "anime" },
  { id: "ab6", url: ab6, label: "Frost Prince", gender: "male", style: "anime" },
  { id: "ab7", url: ab7, label: "Solar King", gender: "male", style: "anime" },
  { id: "ab8", url: ab8, label: "Crystal Mage", gender: "male", style: "anime" },
  { id: "ab9", url: ab9, label: "Astral Spirit", gender: "male", style: "anime" },
  { id: "ab10", url: ab10, label: "Wild Ranger", gender: "male", style: "anime" },
  // Anime girls
  { id: "ag1", url: ag1, label: "Ember Maiden", gender: "female", style: "anime" },
  { id: "ag2", url: ag2, label: "Tide Princess", gender: "female", style: "anime" },
  { id: "ag3", url: ag3, label: "Volt Idol", gender: "female", style: "anime" },
  { id: "ag4", url: ag4, label: "Verdant Nymph", gender: "female", style: "anime" },
  { id: "ag5", url: ag5, label: "Void Witch", gender: "female", style: "anime" },
  { id: "ag6", url: ag6, label: "Frost Maiden", gender: "female", style: "anime" },
  { id: "ag7", url: ag7, label: "Solar Queen", gender: "female", style: "anime" },
  { id: "ag8", url: ag8, label: "Crystal Sage", gender: "female", style: "anime" },
  { id: "ag9", url: ag9, label: "Astral Muse", gender: "female", style: "anime" },
  { id: "ag10", url: ag10, label: "Wild Ranger", gender: "female", style: "anime" },
];

export const getAvatarById = (id: string | null | undefined): AvatarOption | undefined =>
  id ? avatars.find((a) => a.id === id) : undefined;

export const getAvatarUrl = (id: string | null | undefined): string | undefined => getAvatarById(id)?.url;
