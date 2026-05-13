const translations = {
  pt: {
    // Navbar
    feed: 'Feed',
    forum: 'Fórum',
    myGarden: 'Meu Jardim',
    search: 'Buscar',
    publish: 'Publicar',
    signOut: 'Sair',
    newPost: 'Nova publicação',

    // Busca
    searchTitle: 'Buscar',
    searchPlaceholder: 'Pessoas, #hashtags, palavras...',
    searchPrompt: 'Digite para buscar',
    searching: 'Buscando...',
    noResults: 'Nenhum resultado encontrado',
    people: 'Pessoas',
    hashtags: 'Hashtags',
    posts: 'Posts',
    follow: 'Seguir',
    following: 'Seguindo',
    noPeople: 'Nenhuma pessoa encontrada',
    noHashtags: 'Nenhuma hashtag encontrada',
    noPosts: 'Nenhum post encontrado',
    post: 'post',
    postsPlural: 'posts',

    // Feed
    clearFilter: '✕ limpar filtro',
    noPostsTag: (tag) => `Nenhum post com #${tag} ainda.`,
    noPostsYet: 'Nenhum post ainda. Seja o primeiro! 🌿',

    // Login
    tagline: 'A rede social para quem ama plantas 🌿',
    signInGoogle: 'Entrar com Google',
    signInEmail: 'Entrar com e-mail',
    createAccount: 'Criar conta',
    back: '← Voltar',
    signIn: 'Entrar',
    signingIn: 'Entrando...',
    email: 'E-mail',
    password: 'Senha',
    username: 'Nome de usuário',
    passwordMin: 'Senha (mín. 6 caracteres)',
    noAccount: 'Não tem conta? Cadastre-se',
    hasAccount: 'Já tem conta? Entre',
    creatingAccount: 'Criando conta...',
    confirmEmail: 'Confirme seu e-mail',
    confirmEmailText: (email) => `Enviamos um link de confirmação para`,
    confirmEmailAction: 'Clique no link para ativar sua conta.',
    goToLogin: 'Ir para o login',
    fillEmailPassword: 'Preencha e-mail e senha.',
    fillAllFields: 'Preencha todos os campos.',
    passwordTooShort: 'A senha precisa ter pelo menos 6 caracteres.',
    wrongCredentials: 'E-mail ou senha incorretos.',
    chooseCategoryAndTitle: 'Escolha uma categoria e escreva sua pergunta.',

    // Notificações
    notifications: 'Notificações',
    markAllRead: 'marcar todas como lidas',
    clear: 'limpar',
    noNotifications: 'Nenhuma notificação ainda 🌱',

    // Fórum
    forumTitle: 'Fórum',
    newQuestion: '+ Pergunta',
    sendQuestion: 'Enviar pergunta',
    sendingQuestion: 'Enviando...',
    addImage: '🖼️ Adicionar imagem (opcional)',
    yourQuestion: 'Sua pergunta...',
    moreDetails: 'Mais detalhes (opcional)...',
    replies: 'respostas',
    noQuestions: 'Nenhuma pergunta ainda. Seja o primeiro! 🌱',
    noRepliesYet: 'Nenhuma resposta ainda. Seja o primeiro! 🌱',
    writeReply: 'Escreva um comentário...',
    send: 'Enviar',
    loginToComment: 'Faça login para comentar',
    reply: 'responder',
    cancel: 'cancelar',
    delete: 'excluir',
    by: 'por',
    replyTo: (username) => `Responder @${username}...`,

    // Geral
    deletePostConfirm: 'Tem certeza que quer excluir esta pergunta?',
    ago: 'agora',
    liked: (u) => `${u} curtiu sua foto 🌿`,
    replied: (u, t) => `${u} respondeu sua pergunta: "${t}"`,
    repliedComment: (u, t) => `${u} respondeu seu comentário no tópico: "${t}..."`,
  },

  en: {
    // Navbar
    feed: 'Feed',
    forum: 'Forum',
    myGarden: 'My Garden',
    search: 'Search',
    publish: 'Post',
    signOut: 'Sign out',
    newPost: 'New post',

    // Busca
    searchTitle: 'Search',
    searchPlaceholder: 'People, #hashtags, words...',
    searchPrompt: 'Type to search',
    searching: 'Searching...',
    noResults: 'No results found',
    people: 'People',
    hashtags: 'Hashtags',
    posts: 'Posts',
    follow: 'Follow',
    following: 'Following',
    noPeople: 'No people found',
    noHashtags: 'No hashtags found',
    noPosts: 'No posts found',
    post: 'post',
    postsPlural: 'posts',

    // Feed
    clearFilter: '✕ clear filter',
    noPostsTag: (tag) => `No posts with #${tag} yet.`,
    noPostsYet: 'No posts yet. Be the first! 🌿',

    // Login
    tagline: 'The social network for plant lovers 🌿',
    signInGoogle: 'Sign in with Google',
    signInEmail: 'Sign in with email',
    createAccount: 'Create account',
    back: '← Back',
    signIn: 'Sign in',
    signingIn: 'Signing in...',
    email: 'Email',
    password: 'Password',
    username: 'Username',
    passwordMin: 'Password (min. 6 characters)',
    noAccount: "Don't have an account? Sign up",
    hasAccount: 'Already have an account? Sign in',
    creatingAccount: 'Creating account...',
    confirmEmail: 'Confirm your email',
    confirmEmailText: (email) => `We sent a confirmation link to`,
    confirmEmailAction: 'Click the link to activate your account.',
    goToLogin: 'Go to login',
    fillEmailPassword: 'Please fill in your email and password.',
    fillAllFields: 'Please fill in all fields.',
    passwordTooShort: 'Password must be at least 6 characters.',
    wrongCredentials: 'Incorrect email or password.',
    chooseCategoryAndTitle: 'Choose a category and write your question.',

    // Notificações
    notifications: 'Notifications',
    markAllRead: 'mark all as read',
    clear: 'clear',
    noNotifications: 'No notifications yet 🌱',

    // Fórum
    forumTitle: 'Forum',
    newQuestion: '+ Question',
    sendQuestion: 'Send question',
    sendingQuestion: 'Sending...',
    addImage: '🖼️ Add image (optional)',
    yourQuestion: 'Your question...',
    moreDetails: 'More details (optional)...',
    replies: 'replies',
    noQuestions: 'No questions yet. Be the first! 🌱',
    noRepliesYet: 'No replies yet. Be the first! 🌱',
    writeReply: 'Write a comment...',
    send: 'Send',
    loginToComment: 'Sign in to comment',
    reply: 'reply',
    cancel: 'cancel',
    delete: 'delete',
    by: 'by',
    replyTo: (username) => `Reply to @${username}...`,

    // Geral
    deletePostConfirm: 'Are you sure you want to delete this question?',
    ago: 'now',
    liked: (u) => `${u} liked your photo 🌿`,
    replied: (u, t) => `${u} replied to your question: "${t}"`,
    repliedComment: (u, t) => `${u} replied to your comment in: "${t}..."`,
  }
}

export function getLocale() {
  if (typeof navigator === 'undefined') return 'pt'
  const lang = navigator.language || navigator.languages?.[0] || 'pt'
  return lang.toLowerCase().startsWith('pt') ? 'pt' : 'en'
}

export function useT() {
  const locale = getLocale()
  return translations[locale] ?? translations.pt
}
