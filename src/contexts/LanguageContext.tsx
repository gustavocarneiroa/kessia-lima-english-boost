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
    'hero.title': 'Teacher Késsia Lima',
    'hero.subtitle': 'Para você sair do Inglês Basicão!',
    'hero.description': 'Aprender Inglês não precisa ser complicado. Com o acompanhamento certo e aulas que fazem sentido para sua rotina e seus objetivos, você finalmente vai conseguir sair do básico e se comunicar com confiança em situações reais. Aqui, você estuda no seu ritmo, com apoio constante e conteúdos que vão direto ao ponto, seja para entrevistas, viagens ou o dia a dia.',
    'hero.button': 'Quero aprender inglês',
    'hero.limitedSpots': 'Vagas limitadas',
    'hero.title1': 'O que você alcançaria se saísse do Inglês Basicão?',
    'hero.button1': 'Quero aprender inglês',
    'hero.title2': 'Faça nosso teste de nível online. É rápido e grátis, vamos começar?',
    'hero.button2': 'Iniciar teste',
    
    // CTA Section
    'cta.title': 'Leve seu inglês para outro nível! Eu posso te ajudar!',
    'cta.button': 'Quero aprender inglês',

    // Pricing Section
    'pricing.title': 'Pacotes de Aulas',
    'pricing.subtitle': 'Escolha o pacote ideal para seu aprendizado',
    'pricing.morningAfternoon': 'Manhã/Tarde',
    'pricing.night': 'Noite',
    'pricing.classesUnit': 'aulas',
    'pricing.note': '* Aulas individuais de 1 hora cada',
    'pricing.bestValue': 'Melhor Custo-Benefício',
    'pricing.installmentsOf': 'parcelas de',
    'pricing.individualClasses': 'Aulas individuais de 1h',
    'pricing.personalizedMaterial': 'Material personalizado',
    'pricing.selectPlan': 'Escolher Plano',

    'about.title': 'Quem sou',
      'about.description': `Hello! ✨ Eu sou a Teacher Késsia.
Comecei a ensinar Inglês em 2013, em uma escola de cursos profissionalizantes. Desde então, já lecionei para turmas a partir dos 4 anos de idade, mas hoje meu foco é em adolescentes e adultos, especialmente aqueles que atuam ou desejam atuar na área de programação.
Aprendi Inglês sozinha aos 12 anos, com a ajuda de músicas, filmes e séries. Aos 18, comecei um curso em uma escola de idiomas, onde estudei por 3 anos e aprofundei meus conhecimentos.
Depois de 9 anos trabalhando em escolas tradicionais, senti que era hora de criar algo com a minha cara. Assim nasceu o Teacher Késsia Lima, um projeto feito para ajudar adultos a saírem do famoso “Inglês Basicão” e finalmente conseguirem se comunicar com confiança em entrevistas, viagens e no dia a dia.
Minhas aulas são focadas em conversação, vocabulário útil para a vida real e situações práticas, com atividades personalizadas para cada objetivo, seja falar com naturalidade no trabalho, entender nativos com mais facilidade ou destravar de vez a fala. Tudo isso com uma abordagem leve, acessível e eficiente, mesmo para quem já tentou aprender antes e não conseguiu.`,
    
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
    'faq.question1': 'Quanto leva para aprender inglês?',
    'faq.answer1': 'O tempo varia de acordo com seu nível atual, dedicação e objetivos. Mas com aulas regulares e prática consistente, muitos alunos já percebem um progresso significativo em cerca de 4 meses.',
    'faq.question2': 'As aulas são individuais ou em grupo?',
    'faq.answer2': 'Oferecemos aulas individuais e também em pequenos grupos. Tudo depende da sua preferência, disponibilidade e estilo de aprendizagem. Ambas as opções garantem atenção personalizada e foco na conversação.',
    'faq.question3': 'Qual metodologia é utilizada?',
    'faq.answer3': 'Trabalhamos com uma abordagem comunicativa, ou seja, foco na prática real da língua. Utilizamos materiais atualizados, situações do cotidiano e atividades interativas que ajudam você a se expressar com naturalidade em inglês.',
    'faq.question4': 'Oferecem certificado?',
    'faq.answer4': 'Sim! Ao final do curso, você pode solicitar um certificado de conclusão, com a carga horária e o nível alcançado, ótimo para enriquecer o currículo e comprovar seu progresso.',
    'faq.question5': 'Como funcionam as aulas online?',
    'faq.answer5': 'As aulas são realizadas pelo Google Meet, com material compartilhado em tempo real e muita interação. Tudo é pensado para manter a qualidade, a proximidade e a personalização, mesmo à distância.',
    'faq.question6': 'Já tentei estudar antes e não consegui. As aulas particulares são para mim?',
    'faq.answer6': 'Sim! Muitos dos meus alunos já passaram por cursos tradicionais e não conseguiram avançar. Aqui, o foco é em destravar a fala, construir confiança e usar o Inglês na prática, de forma leve e eficiente.',
    'faq.question7': 'Preciso saber o básico para começar?',
    'faq.answer7': 'Não! Você pode começar do zero. As aulas são adaptadas ao seu nível, e você vai aprender desde as estruturas mais simples até formas mais naturais de se comunicar.',
    'faq.contact': 'Caso sua dúvida não esteja aqui, entre em contato conosco, teremos o maior prazer em respondê-la!',
    
    // Testimonials
    'testimonials.title': 'O que meus alunos dizem',
    'testimonials.viewMore': 'Ver feedback completo',
    'testimonials.portuguese': 'Português',
    'testimonials.english': 'English',
    
    // Footer
    'footer.language': 'Idioma / Language',
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
    'hero.title': 'Teacher Késsia Lima',
    'hero.subtitle': 'Stop being Basic in English!',
    'hero.description': 'Learning English does not need to be hard. With the right help and classes that fit your life and goals, you will finally leave basic level and speak with confidence in real situations. Here, you study at your speed, with help all the time and content that goes to the point, for interviews, trips or daily life.',
    'hero.button': 'I want to learn English',
    'hero.limitedSpots': 'Limited spots',
    'hero.title1': 'What could you do if you stopped being basic in English?',
    'hero.button1': 'I want to learn English',
    'hero.title2': 'Take our online level test. It is quick and free. Let us start?',
    'hero.button2': 'Start test',
    
    // CTA Section
    'cta.title': 'Take your English to the next level! I can help you!',
    'cta.button': 'I want to learn English',

    // Pricing Section
    'pricing.title': 'Class Packages',
    'pricing.subtitle': 'Choose the perfect package for your learning',
    'pricing.morningAfternoon': 'Morning/Afternoon',
    'pricing.night': 'Night',
    'pricing.classesUnit': 'classes',
    'pricing.note': '* Individual classes of 1 hour each',
    'pricing.bestValue': 'Best Value',
    'pricing.installmentsOf': 'payments of',
    'pricing.individualClasses': '1-hour individual classes',
    'pricing.personalizedMaterial': 'Personal study material',
    'pricing.selectPlan': 'Choose Plan',

    'about.title': 'Who I am',
      'about.description': 'Késsia Lima has been an English Teacher since 2013 when she started teaching at a school. Since then she has been teaching students of all ages online. She loves English since she was a child. Késsia has always had contact with the language through music, TV shows and movies. In 2018 she created an Instagram profile to share English tips, but now she uses the profile to show her routine of preparing personal classes and her posts about how to really learn English.',
    
    // Services
    'services.title': 'What do I offer?',
    'services.general.title': 'General English',
    'services.general.description': 'In this class, we work the 4 skills: speaking, reading, writing and listening. We also work on language systems like pronunciation, grammar and vocabulary.',
    'services.business.title': 'Business English',
    'services.business.description': 'Classes for work environment. We work on specific vocabulary, presentations, meetings and professional communication for your career.',
    'services.conversation.title': 'Conversation',
    'services.conversation.description': 'Practice speaking with natural conversations about topics you like. Build confidence to communicate in any situation.',
    'services.exam.title': 'Exam preparation',
    'services.exam.description': 'Special preparation for international exams like TOEFL, IELTS, Cambridge and others, with strategies and practice.',
    
    // FAQ
    'faq.title': 'Common questions',
    'faq.question1': 'How long does it take to learn English?',
    'faq.answer1': 'Time changes according to your current level, dedication and goals. But with regular classes and consistent practice, many students already see big progress in about 4 months.',
    'faq.question2': 'Are classes individual or in group?',
    'faq.answer2': 'We offer individual classes and also small groups. It all depends on your preference, availability and learning style. Both options give personalized attention and focus on conversation.',
    'faq.question3': 'What methodology is used?',
    'faq.answer3': 'We work with a communicative approach, that is, focus on real practice of the language. We use updated materials, everyday situations and interactive activities that help you express yourself naturally in English.',
    'faq.question4': 'Do you offer certificate?',
    'faq.answer4': 'Yes! At the end of the course, you can request a completion certificate, with the study hours and level reached, great for improving your resume and showing your progress.',
    'faq.question5': 'How do online classes work?',
    'faq.answer5': 'Classes are held via Google Meet, with material shared in real time and lots of interaction. Everything is designed to keep quality, closeness and personalization, even at a distance.',
    'faq.question6': 'I already tried to study before and could not. Are private classes for me?',
    'faq.answer6': 'Yes! Many of my students have already gone through traditional courses and could not advance. Here, the focus is on unlocking speech, building confidence and using English in practice, in a light and efficient way.',
    'faq.question7': 'Do I need to know the basics to start?',
    'faq.answer7': 'No! You can start from zero. Classes are adapted to your level, and you will learn from the simplest structures to more natural ways of communicating.',
    'faq.contact': 'If your question is not here, contact us. We will be happy to answer it!',
    
    // Testimonials
    'testimonials.title': 'What my students say',
    'testimonials.viewMore': 'View complete feedback',
    'testimonials.portuguese': 'Português',
    'testimonials.english': 'English',
    
    // Footer
    'footer.language': 'Language',
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
    'hero.title': 'Teacher Késsia Lima',
    'hero.subtitle': 'Break through your English barriers!',
    'hero.description': 'Mastering English doesn\'t have to be a huge challenge. With personalized guidance and well-designed lessons that fit your lifestyle and professional goals, you\'ll finally move beyond basic proficiency and communicate with real confidence in authentic situations. Here, you\'ll progress at your own pace, receiving continuous support and accessing targeted content that addresses your specific needs—whether you\'re preparing for important interviews, international travel, or career advancement.',
    'hero.button': 'I want to learn English',
    'hero.limitedSpots': 'Limited spots',
    'hero.title1': 'What could you achieve by breaking through your English barriers?',
    'hero.button1': 'I want to learn English',
    'hero.title2': 'Take our comprehensive online level test. It\'s quick, free, and we\'re ready to start whenever you are!',
    'hero.button2': 'Start test',
    
    // CTA Section
    'cta.title': 'Take your English to the next level! I\'m here to guide you through this journey!',
    'cta.button': 'I want to learn English',

    // Pricing Section
    'pricing.title': 'Class Packages',
    'pricing.subtitle': 'Choose the ideal package for your learning journey',
    'pricing.morningAfternoon': 'Morning/Afternoon',
    'pricing.night': 'Night',
    'pricing.classesUnit': 'classes',
    'pricing.note': '* Individual classes of 1 hour each',
    'pricing.bestValue': 'Best Value',
    'pricing.installmentsOf': 'installments of',
    'pricing.individualClasses': '1-hour individual classes',
    'pricing.personalizedMaterial': 'Personalized materials',
    'pricing.selectPlan': 'Select Plan',

    'about.title': 'Who I am',
    'about.description': 'Késsia Lima has been an English Teacher since 2013 when she started teaching at a vocational school. Since then she\'s been teaching students of all ages remotely. Passionate about English since childhood, Késsia has always had contact with the language through music, series and movies. In 2018 she created an Instagram profile to share English tips, but currently uses the profile to show her routine of preparing personalized classes and her posts about how to really learn English.',
    
    // Services
    'services.title': 'What do I offer?',
    'services.general.title': 'General English',
    'services.general.description': 'In this comprehensive program, we develop all four essential language skills: speaking, reading, writing, and listening comprehension, while strengthening the core language systems including pronunciation, grammar, and vocabulary.',
    'services.business.title': 'Business English',
    'services.business.description': 'Specialized courses for corporate environments, focusing on industry-specific vocabulary, professional presentations, effective meetings, and strategic business communication to accelerate your career.',
    'services.conversation.title': 'Conversation Practice',
    'services.conversation.description': 'Improve your speaking fluency through dynamic, natural conversations covering diverse topics that match your interests, building the confidence you need for effective communication in any professional or social context.',
    'services.exam.title': 'Exam Preparation',
    'services.exam.description': 'Targeted preparation for internationally recognized exams including TOEFL, IELTS, Cambridge certifications, and others, featuring proven strategies and focused practice sessions.',
    
    // FAQ
    'faq.title': 'Frequently Asked Questions',
    'faq.question1': 'What\'s the typical timeframe for achieving English proficiency?',
    'faq.answer1': 'The duration varies depending on your current level, commitment, and specific goals. However, with consistent lessons and dedicated practice, many students already notice significant progress within about 4 months.',
    'faq.question2': 'Do you offer individual instruction or group sessions?',
    'faq.answer2': 'We provide both individual classes and small group sessions. It entirely depends on your preference, availability, and learning style. Both options ensure personalized attention and conversation focus.',
    'faq.question3': 'What teaching methodology do you use?',
    'faq.answer3': 'We use a communicative approach, emphasizing real-world language practice. We utilize contemporary materials, everyday situations, and interactive activities that help you express yourself naturally in English.',
    'faq.question4': 'Is certification provided upon course completion?',
    'faq.answer4': 'Absolutely! Upon course completion, you can request a certificate featuring your study hours and achieved level—excellent for resume enhancement and progress validation.',
    'faq.question5': 'How are online classes structured and delivered?',
    'faq.answer5': 'Classes are conducted via Google Meet, with real-time material sharing and extensive interaction. Everything\'s designed to maintain quality, proximity, and personalization, even remotely.',
    'faq.question6': 'I\'ve tried learning before unsuccessfully. Are private classes suitable for me?',
    'faq.answer6': 'Absolutely! Many of my students have previously experienced traditional courses without advancement. Here, we focus on unlocking speech, building confidence, and practical English application through an approachable and efficient methodology.',
    'faq.question7': 'Do I need basic knowledge to start?',
    'faq.answer7': 'Not at all! You can begin from absolute beginner level. Classes are tailored to your level, progressing from fundamental structures to sophisticated communication methods.',
    'faq.contact': 'If your question isn\'t addressed here, please don\'t hesitate to contact us—we\'d be delighted to provide you with a comprehensive response!',
    
    // Testimonials
    'testimonials.title': 'What my students say',
    'testimonials.viewMore': 'View complete testimonial',
    'testimonials.portuguese': 'Português',
    'testimonials.english': 'English',
    
    // Footer
    'footer.language': 'Language',
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