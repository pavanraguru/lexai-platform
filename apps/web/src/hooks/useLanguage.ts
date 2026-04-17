'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LangCode = 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml' | 'mr' | 'gu' | 'bn';

export interface Language {
  code: LangCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English',   nativeName: 'English',    flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi',     nativeName: 'हिन्दी',      flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',    nativeName: 'తెలుగు',      flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil',     nativeName: 'தமிழ்',       flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada',   nativeName: 'ಕನ್ನಡ',       flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം',     flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi',   nativeName: 'मराठी',       flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati',  nativeName: 'ગુજરાતી',    flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali',   nativeName: 'বাংলা',       flag: '🇮🇳' },
];

// UI label translations for core strings
export const UI_STRINGS: Record<string, Record<LangCode, string>> = {
  dashboard:        { en:'Dashboard',      hi:'डैशबोर्ड',    te:'డాష్‌బోర్డ్', ta:'டாஷ்போர்டு', kn:'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', ml:'ഡാഷ്‌ബോർഡ്',  mr:'डॅशबोर्ड',    gu:'ડૅશબોર્ડ',    bn:'ড্যাশবোর্ড' },
  my_cases:         { en:'My Cases',       hi:'मेरे मामले',  te:'నా కేసులు',   ta:'என் வழக்குகள்', kn:'ನನ್ನ ಪ್ರಕರಣಗಳು', ml:'എന്റെ കേസുകൾ', mr:'माझे प्रकरण',  gu:'મારા કેસ',    bn:'আমার মামলা' },
  calendar:         { en:'Calendar',       hi:'कैलेंडर',     te:'క్యాలెండర్',  ta:'நாட்காட்டி',  kn:'ಕ್ಯಾಲೆಂಡರ್',    ml:'കലണ്ടർ',      mr:'कॅलेंडर',     gu:'કૅલેન્ડર',    bn:'ক্যালেন্ডার' },
  filings:          { en:'Filings',        hi:'फाइलिंग',     te:'ఫైలింగులు',   ta:'தாக்கல்கள்',  kn:'ಫೈಲಿಂಗ್‌ಗಳು',   ml:'ഫയലിംഗ്',     mr:'दाखल',        gu:'ફાઈલિંગ',     bn:'ফাইলিং' },
  drafts:           { en:'Drafts',         hi:'मसौदे',       te:'డ్రాఫ్ట్లు',  ta:'வரைவுகள்',    kn:'ಕರಡುಗಳು',        ml:'ഡ്രാഫ്‌റ്റ്',  mr:'मसुदे',       gu:'ડ્રાફ્ટ',     bn:'খসড়া' },
  clients:          { en:'Clients',        hi:'मुवक्किल',    te:' క్లయింట్లు',  ta:'வாடிக்கையாளர்கள்', kn:'ಗ್ರಾಹಕರು',   ml:'ക്ലയന്റ്',    mr:'अशील',        gu:'ક્લાઇન્ટ',    bn:'মক্কেল' },
  billing:          { en:'Billing',        hi:'बिलिंग',      te:'బిల్లింగ్',   ta:'பில்லிங்',    kn:'ಬಿಲ್ಲಿಂಗ್',      ml:'ബില്ലിംഗ്',    mr:'बिलिंग',      gu:'બિલિંગ',      bn:'বিলিং' },
  settings:         { en:'Settings',       hi:'सेटिंग्स',    te:'సెట్టింగులు',  ta:'அமைப்புகள்',  kn:'ಸೆಟ್ಟಿಂಗ್‌ಗಳು',  ml:'ക്രമീകരണങ്ങൾ',mr:'सेटिंग्ज',    gu:'સેટિંગ્સ',    bn:'সেটিংস' },
  save:             { en:'Save',           hi:'सहेजें',      te:'సేవ్ చేయి',   ta:'சேமி',        kn:'ಉಳಿಸು',          ml:'സേവ് ചെയ്യുക', mr:'जतन करा',     gu:'સાચવો',       bn:'সংরক্ষণ' },
  overview:         { en:'Overview',       hi:'अवलोकन',      te:'అవలోకనం',     ta:'கண்ணோட்டம்',  kn:'ಅವಲೋಕನ',         ml:'അവലോകനം',    mr:'आढावा',       gu:'ઓવરવ્યૂ',     bn:'সারসংক্ষেপ' },
  documents:        { en:'Documents',      hi:'दस्तावेज़',    te:'పత్రాలు',     ta:'ஆவணங்கள்',    kn:'ದಾಖಲೆಗಳು',       ml:'രേഖകൾ',       mr:'दस्तऐवज',     gu:'દસ્તાવેજ',    bn:'নথিপত্র' },
  hearings:         { en:'Hearings',       hi:'सुनवाई',      te:'విచారణలు',    ta:'விசாரணைகள்',  kn:'ವಿಚಾರಣೆಗಳು',    ml:'വിചാരണകൾ',    mr:'सुनावण्या',   gu:'સુનાવણી',     bn:'শুনানি' },
  tasks:            { en:'Tasks',          hi:'कार्य',       te:'పనులు',       ta:'பணிகள்',      kn:'ಕಾರ್ಯಗಳು',       ml:'ജോലികൾ',      mr:'कार्ये',      gu:'કાર્ય',       bn:'কাজ' },
  agents:           { en:'Agents',         hi:'एजेंट',       te:'ఏజెంట్లు',    ta:'முகவர்கள்',   kn:'ಏಜೆಂಟ್‌ಗಳು',    ml:'ഏജന്റ്',      mr:'एजंट',        gu:'એજન્ટ',       bn:'এজেন্ট' },
  next_hearing:     { en:'Next Hearing',   hi:'अगली सुनवाई', te:'తదుపరి విచారణ', ta:'அடுத்த விசாரணை', kn:'ಮುಂದಿನ ವಿಚಾರಣೆ', ml:'അടുത്ത വിചാരണ', mr:'पुढील सुनावणी', gu:'આગળની સુનાવણી', bn:'পরবর্তী শুনানি' },
  ai_generate:      { en:'AI Generate',    hi:'AI जेनरेट',   te:'AI జెనరేట్',  ta:'AI உருவாக்கு', kn:'AI ಜನರೇಟ್',    ml:'AI ഉണ്ടാക്കുക', mr:'AI निर्माण',  gu:'AI ઉત્પન્ન',  bn:'AI তৈরি' },
  back:             { en:'Back',           hi:'वापस',        te:'వెనుక',       ta:'பின்னால்',     kn:'ಹಿಂದೆ',          ml:'പിന്നിലേക്ക്',  mr:'मागे',        gu:'પાછળ',        bn:'পিছনে' },
  case_details:     { en:'Case Details',   hi:'मामले का विवरण', te:'కేసు వివరాలు', ta:'வழக்கு விவரங்கள்', kn:'ಪ್ರಕರಣದ ವಿವರಗಳು', ml:'കേസ് വിവരങ്ങൾ', mr:'प्रकरण तपशील', gu:'કેસ વિગત', bn:'মামলার বিবরণ' },
};

export function t(key: string, lang: LangCode): string {
  return UI_STRINGS[key]?.[lang] || UI_STRINGS[key]?.['en'] || key;
}

interface LangStore {
  lang: LangCode;
  setLang: (l: LangCode) => void;
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({ lang: 'en', setLang: (lang) => set({ lang }) }),
    { name: 'lexai-language' }
  )
);

export function useLang() {
  const { lang, setLang } = useLangStore();
  const tr = (key: string) => t(key, lang);
  return { lang, setLang, tr };
}
