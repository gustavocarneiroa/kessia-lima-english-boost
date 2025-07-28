import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'pt' | 'en-basic' | 'en-intermediate';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  pt: {
    // Header
    'header.home': 'Início',
    'header.services': 'Serviços',
    'header.about': 'Sobre',
    'header.contact': 'Contato',
    'header.talkToMe': 'Fale comigo',
    
    // Hero Section
    'hero.title1': 'O que você alcançaria se saísse do INGLÊS BASICÃO?',
    'hero.button1': 'Quero aprender inglês',
    'hero.title2': 'Faça nosso teste de nível online. É rápido e grátis, vamos começar?',
    'hero.button2': 'Iniciar teste',
    
    // CTA Section
      'cta.title': 'Leve seu inglês para outro nível! Eu posso te ajudar!',
      'cta.button': 'Quero aprender inglês',
      'about.title': 'Quem sou',
      'about.description': 'Késsia Lima é uma English Teacher desde 2013 onde começou a ensinar em uma escola de cursos profissionalizantes. Desde então ela ensina alunos de todas as idades de forma remota. Apaixonada por Inglês desde a sua infância, Késsia sempre teve contato com o idioma através de músicas, séries e filmes. Em 2018 criou um perfil no instagram para compartilhar apenas dicas de Inglês, mas atualmente usa o perfil para mostrar sua rotina de preparação de aulas personalizadas e seus posts sobre como aprender Inglês de verdade.',
    
    // Services
    'services.title': 'O que ofereço?',
    'services.general.title': 'Inglês em geral',
    'services.general.description': 'Nesta modalidade, trabalhamos as 4 habilidades da língua: fala, leitura, escrita e compreensão oral (listening) e, ao mesmo tempo, desenvolvemos os sistemas da língua (pronúncia, gramática e vocabulário).',
    'services.business.title': 'Inglês para negócios',
    'services.business.description': 'Aulas focadas no ambiente corporativo, desenvolvendo vocabulário específico, apresentações, reuniões e comunicação profissional para alavancar sua carreira.',
    'services.conversation.title': 'Conversação',
    'services.conversation.description': 'Pratique a fluência oral com conversas naturais sobre temas do seu interesse, desenvolvendo confiança para se comunicar em qualquer situação.',
    'services.exam.title': 'Preparação para exames',
    'services.exam.description': 'Preparação específica para exames internacionais como TOEFL, IELTS, Cambridge e outros, com estratégias e prática direcionada.',
    
    // FAQ
    'faq.title': 'Perguntas frequentes',
    'faq.question1': 'Quanto tempo leva para aprender inglês?',
    'faq.answer1': 'O tempo varia conforme seu nível atual, dedicação e objetivos. Em média, com aulas regulares e prática, você pode ver progresso significativo em 6 meses.',
    'faq.question2': 'As aulas são individuais ou em grupo?',
    'faq.answer2': 'Oferecemos tanto aulas individuais quanto em pequenos grupos, adaptando-se às suas preferências e necessidades de aprendizagem.',
    'faq.question3': 'Qual metodologia é utilizada?',
    'faq.answer3': 'Utilizo uma abordagem comunicativa, focando na prática real da língua com materiais atualizados e exercícios interativos.',
    'faq.question4': 'Oferecem certificado?',
    'faq.answer4': 'Sim, ao final do curso você recebe um certificado de conclusão que comprova suas horas de estudo e nível alcançado.',
    'faq.question5': 'Como funcionam as aulas online?',
    'faq.answer5': 'As aulas online são realizadas via plataformas como Zoom ou Google Meet, com materiais compartilhados em tempo real e interação total.',
    'faq.contact': 'Caso sua dúvida não esteja aqui, entre em contato conosco, teremos o maior prazer em respondê-la!',
    
    // Testimonials
    'testimonials.title': 'O que meus alunos dizem',
    'testimonials.viewMore': 'Ver feedback completo',
    'testimonials.portuguese': 'Português',
    'testimonials.english': 'English',
    
    // Footer
    'footer.followUs': 'Me siga',
    'footer.contact': 'Fale comigo'
  },
  
  'en-basic': {
    // Header
    'header.home': 'Home',
    'header.services': 'Services',
    'header.about': 'About',
    'header.contact': 'Contact',
    'header.talkToMe': 'Talk to me',
    
    // Hero Section
    'hero.title1': 'What could you do if you left BASIC ENGLISH?',
    'hero.button1': 'I want to learn English',
    'hero.title2': 'Take our online level test. It is quick and free. Let\'s start?',
    'hero.button2': 'Start test',
    
    // CTA Section
      'cta.title': 'Take your English to the next level! I can help you!',
      'cta.button': 'I want to learn English',
      'about.title': 'Who I am',
      'about.description': 'Késsia Lima has been an English Teacher since 2013 when she started teaching at a vocational school. Since then she has been teaching students of all ages remotely. Passionate about English since childhood, Késsia has always had contact with the language through music, series and movies. In 2018 she created an Instagram profile to share only English tips, but currently uses the profile to show her routine of preparing personalized classes and her posts about how to really learn English.',
    
    // Services
    'services.title': 'What do I offer?',
    'services.general.title': 'General English',
    'services.general.description': 'In this class, we work the 4 skills: speaking, reading, writing and listening. We also develop language systems (pronunciation, grammar and vocabulary).',
    'services.business.title': 'Business English',
    'services.business.description': 'Classes for work environment. We develop specific vocabulary, presentations, meetings and professional communication for your career.',
    'services.conversation.title': 'Conversation',
    'services.conversation.description': 'Practice speaking with natural conversations about topics you like. Develop confidence to communicate in any situation.',
    'services.exam.title': 'Exam preparation',
    'services.exam.description': 'Specific preparation for international exams like TOEFL, IELTS, Cambridge and others, with strategies and directed practice.',
    
    // FAQ
    'faq.title': 'Frequent questions',
    'faq.question1': 'How long does it take to learn English?',
    'faq.answer1': 'Time varies according to your current level, dedication and goals. On average, with regular classes and practice, you can see progress in 6 months.',
    'faq.question2': 'Are classes individual or in group?',
    'faq.answer2': 'We offer individual classes and small groups, adapting to your preferences and learning needs.',
    'faq.question3': 'What methodology is used?',
    'faq.answer3': 'I use a communicative approach, focusing on real practice of the language with updated materials and interactive exercises.',
    'faq.question4': 'Do you offer certificate?',
    'faq.answer4': 'Yes, at the end of the course you receive a completion certificate that proves your study hours and level achieved.',
    'faq.question5': 'How do online classes work?',
    'faq.answer5': 'Online classes are done via platforms like Zoom or Google Meet, with materials shared in real time and total interaction.',
    'faq.contact': 'If your question is not here, contact us. We will be happy to answer it!',
    
    // Testimonials
    'testimonials.title': 'What my students say',
    'testimonials.viewMore': 'View complete feedback',
    'testimonials.portuguese': 'Português',
    'testimonials.english': 'English',
    
    // Footer
    'footer.followUs': 'Follow me',
    'footer.contact': 'Talk to me'
  },
  
  'en-intermediate': {
    // Header
    'header.home': 'Home',
    'header.services': 'Services',
    'header.about': 'About',
    'header.contact': 'Contact',
    'header.talkToMe': 'Talk to me',
    
    // Hero Section
    'hero.title1': 'What achievements would you unlock by breaking through your English limitations?',
    'hero.button1': 'I want to learn English',
    'hero.title2': 'Take our comprehensive online level assessment. It\'s quick, free, and we\'re ready to begin whenever you are!',
    'hero.button2': 'Start assessment',
    
    // CTA Section
    'cta.title': 'Elevate your English proficiency to the next level! I\'m here to guide you through this journey!',
    'cta.button': 'I want to learn English',
    'about.title': 'Who I am',
    'about.description': 'Késsia Lima has been an English Teacher since 2013 when she started teaching at a vocational school. Since then she has been teaching students of all ages remotely. Passionate about English since childhood, Késsia has always had contact with the language through music, series and movies. In 2018 she created an Instagram profile to share only English tips, but currently uses the profile to show her routine of preparing personalized classes and her posts about how to really learn English.',
    
    // Services
    'services.title': 'What do I offer?',
    'services.general.title': 'General English',
    'services.general.description': 'In this comprehensive program, we develop all four essential language skills: speaking, reading, writing, and listening comprehension, while simultaneously strengthening the core language systems including pronunciation, grammar, and vocabulary acquisition.',
    'services.business.title': 'Business English',
    'services.business.description': 'Specialized courses tailored for corporate environments, focusing on industry-specific terminology, professional presentations, effective meeting facilitation, and strategic business communication to accelerate your career advancement.',
    'services.conversation.title': 'Conversation Practice',
    'services.conversation.description': 'Enhance your oral fluency through dynamic, natural conversations covering diverse topics aligned with your interests, building the confidence necessary for effective communication in any professional or social context.',
    'services.exam.title': 'Exam Preparation',
    'services.exam.description': 'Targeted preparation for internationally recognized examinations including TOEFL, IELTS, Cambridge certifications, and others, featuring proven strategies and focused practice sessions.',
    
    // FAQ
    'faq.title': 'Frequently Asked Questions',
    'faq.question1': 'What\'s the typical timeframe for achieving English proficiency?',
    'faq.answer1': 'The duration varies depending on your current proficiency level, commitment, and specific objectives. Generally, with consistent lessons and dedicated practice, significant progress becomes evident within 6 months.',
    'faq.question2': 'Do you offer individual instruction or group sessions?',
    'faq.answer2': 'We provide both personalized one-on-one instruction and intimate small group sessions, customizing our approach to match your learning preferences and educational requirements.',
    'faq.question3': 'What teaching methodology do you employ?',
    'faq.answer3': 'I utilize a communicative methodology that emphasizes practical language application through contemporary materials and engaging interactive exercises.',
    'faq.question4': 'Is certification provided upon course completion?',
    'faq.answer4': 'Absolutely. Upon successful completion, you\'ll receive a comprehensive certificate documenting your study hours and the proficiency level you\'ve achieved.',
    'faq.question5': 'How are online classes structured and delivered?',
    'faq.answer5': 'Online sessions are conducted through professional platforms such as Zoom or Google Meet, featuring real-time material sharing and comprehensive interactive engagement.',
    'faq.contact': 'Should your inquiry not be addressed here, please don\'t hesitate to contact us—we\'d be delighted to provide you with a comprehensive response!',
    
    // Testimonials
    'testimonials.title': 'Student Success Stories',
    'testimonials.viewMore': 'View complete testimonial',
    'testimonials.portuguese': 'Português',
    'testimonials.english': 'English',
    
    // Footer
    'footer.followUs': 'Follow me',
    'footer.contact': 'Contact me'
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};