import { useState, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const T = {
  bg:        "#F7F3EE",
  card:      "#FFFFFF",
  dark:      "#141210",
  darkCard:  "#1E1A16",
  darkCard2: "#252018",
  glass:     "rgba(255,255,255,0.82)",
  ink:       "#1A1410",
  ink2:      "#6B5C4E",
  ink3:      "#B0A396",
  sep:       "rgba(0,0,0,0.06)",
  sepDark:   "rgba(255,255,255,0.08)",
  orange:    "#C8673A",
  orangeHi:  "#E07848",
  orangeDim: "rgba(200,103,58,0.13)",
  orangeGlow:"rgba(200,103,58,0.30)",
  green:     "#27A85F",
  greenDim:  "rgba(39,168,95,0.15)",
  greenGlow: "rgba(39,168,95,0.25)",
  red:       "#E03030",
  redDim:    "rgba(224,48,48,0.13)",
  gold:      "#C8983A",
  goldDim:   "rgba(200,152,58,0.15)",
  goldGlow:  "rgba(200,152,58,0.25)",
  blue:      "#2E7DD6",
  blueDim:   "rgba(46,125,214,0.15)",
  blueGlow:  "rgba(46,125,214,0.25)",
  purple:    "#9B6DB5",
  purpleDim: "rgba(155,109,181,0.15)",
};

// Curated icon set for category "banners" - line icons in the app's style.
// Each id maps to an SVG path in SVGIcon.
var ICON_BANK = [
  "home", "food", "car", "heart", "film", "cart", "plane", "briefcase",
  "chart", "coins", "gift", "box", "coffee", "book", "dumbbell", "phone",
  "music", "leaf", "laptop", "spark",
  "sun", "star", "droplet", "tool", "credit", "building", "bike", "shirt", "wifi", "tv", "umbrella",
];

// Refined, wealth-adjacent palette. Warm tones first, then jewel tones, then pastels/darks.
var COLOR_BANK = [
  "#C8673A", "#C8983A", "#8B6CEF", "#2799C8", "#27A85F", "#00B4A0",
  "#D97941", "#AF52DE", "#E0556E", "#5A7D9A", "#B0894E", "#6B5C4E",
  "#FF6B6B", "#FF9F1C", "#FFCB47", "#06D6A0", "#118AB2", "#9B5DE5",
  "#F72585", "#3A86FF", "#8AC926", "#F4A261", "#E76F51", "#264653",
  "#E91E8C", "#7C3AED", "#0891B2", "#059669", "#DC2626", "#D97706",
  "#7C2D12", "#1E3A5F", "#14532D", "#4A044E", "#134E4A", "#78350F",
  "#FDA4AF", "#FCD34D", "#6EE7B7", "#93C5FD", "#C4B5FD", "#FCA5A5",
  "#86EFAC", "#67E8F9", "#F9A8D4", "#FDE68A", "#A5B4FC", "#BAE6FD",
];

var DEFAULT_FOLDERS = [
  { id: "f1", name: "Essentials" },
  { id: "f2", name: "Lifestyle" },
  { id: "f3", name: "Income & Wealth" },
];

var DEFAULT_CATEGORIES = [
  { id: "c1",  name: "Housing",       color: "#8B6CEF", icon: "home",      folderId: "f1" },
  { id: "c2",  name: "Food",          color: "#27A85F", icon: "food",      folderId: "f1" },
  { id: "c3",  name: "Transport",     color: "#D97941", icon: "car",       folderId: "f1" },
  { id: "c4",  name: "Health",        color: "#E0556E", icon: "heart",     folderId: "f1" },
  { id: "c5",  name: "Entertainment", color: "#2799C8", icon: "film",      folderId: "f2" },
  { id: "c6",  name: "Shopping",      color: "#AF52DE", icon: "cart",      folderId: "f2" },
  { id: "c7",  name: "Travel",        color: "#00B4A0", icon: "plane",     folderId: "f2" },
  { id: "c8",  name: "Salary",        color: "#27A85F", icon: "briefcase", folderId: "f3" },
  { id: "c9",  name: "Investments",   color: "#C8983A", icon: "chart",     folderId: "f3" },
  { id: "c10", name: "Savings",       color: "#C8673A", icon: "coins",     folderId: "f3" },
  { id: "c11", name: "Other",         color: "#6B5C4E", icon: "box",       folderId: "f2" },
];

// Category lookups. Transactions/budgets reference a catId; fall back to name
// for any legacy data or deleted categories.
function computeAge(dob) {
  if (!dob) return null;
  try {
    var birth = new Date(dob);
    var now = new Date();
    var age = now.getFullYear() - birth.getFullYear();
    var m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
  } catch(e) { return null; }
}

function catById(cats, id) {
  for (var i = 0; i < cats.length; i++) {
    if (cats[i].id === id) return cats[i];
  }
  return null;
}
function catByName(cats, name) {
  for (var i = 0; i < cats.length; i++) {
    if (cats[i].name === name) return cats[i];
  }
  return null;
}
function resolveCat(cats, t) {
  return catById(cats, t.catId) || catByName(cats, t.category) || { id: "", name: t.category || "Other", color: "#6B5C4E", icon: "box" };
}

const UI = "-apple-system, system-ui, sans-serif";
const DISP = "-apple-system, system-ui, sans-serif";

var _currency = { sym: "$" };
var _lang = { code: "en" };
var CURRENCY_OPTIONS = [
  { sym: "$", code: "USD", label: "USD  $" },
  { sym: "€", code: "EUR", label: "EUR  €" },
  { sym: "£", code: "GBP", label: "GBP  £" },
  { sym: "₪", code: "ILS", label: "ILS  ₪" },
  { sym: "¥", code: "JPY", label: "JPY  ¥" },
];
var SYM_TO_CODE = (function() {
  var m = {};
  CURRENCY_OPTIONS.forEach(function(o) { m[o.sym] = o.code; });
  return m;
})();
var LANGUAGE_OPTIONS = [
  { code: "en", label: "English" },
  { code: "he", label: "עברית" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "ar", label: "عربية" },
  { code: "ru", label: "Русский" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
];
var LANGUAGE_NAMES = { en: "English", he: "Hebrew", es: "Spanish", fr: "French", ar: "Arabic", ru: "Russian", de: "German", pt: "Portuguese" };

var TRANSLATIONS = {
  en: { overview:"Overview", activity:"Activity", budgets:"Budgets", goals:"Goals", advisor:"Advisor", profile:"Profile", language:"Language", currency:"Currency", yourPlan:"Your Plan", categories:"Categories", signOut:"Sign Out", richyMember:"Richy member", richyRefersTo:"Richy refers to you as", seeYourPlan:"See your plan by Richard", netBalance:"Net Balance", income:"Income", spent:"Spent", topSpend:"Top spend", morning:"Good morning", afternoon:"Good afternoon", evening:"Good evening", savedThisPeriod:"saved this period", redoQuestionnaire:"Redo Questionnaire", yourPlanByRichard:"Your Plan by Richard", noTransactions:"No transactions yet", noTransactionsSub:"Tap + to log your first one. Awareness is the first step to wealth.", overviewEmptySub:"The Richest Man in Babylon started by tracking every coin. Start yours in Activity.", savingsRate:"Savings Rate", excellent:"Excellent", onTrack:"On track", buildItUp:"Build it up", overspending:"Overspending", thisPeriod:"this period", transactions:"Transactions", whereItWent:"Where it went", overLimit:"over limit", complete:"complete", savedLabel:"saved", spentLabel:"spent", toGo:"to go", recent:"Recent", activeGoal:"active goal", activeGoals:"active goals", today:"Today", yesterday:"Yesterday", moneyIn:"Money In", moneyOut:"Money Out", newTransaction:"New Transaction", editTransaction:"Edit Transaction", addTransaction:"Add Transaction", saveChanges:"Save Changes", deleteTx:"Delete transaction", amount:"Amount", txLabel:"Label", category:"Category", date:"Date", repeat:"Repeat", once:"Once", weekly:"Weekly", monthly:"Monthly", markPending:"Mark as pending", expense:"Expense", noBudgets:"No budgets yet", noBudgetsSub:"Tap + to set a limit for a category. A budget is just telling your money where to go.", newBudget:"New Budget", editLimit:"Edit Limit", addBudget:"Add Budget", removeBudget:"Remove this budget", totalSpent:"Total Spent", byCategory:"By Category", edit:"Edit", delete:"Delete", save:"Save", budgeted:"budgeted", monthlyLimit:"Monthly limit", allCatsHaveBudget:"Every category already has a budget. Add a new category first.", noGoals:"No budget books yet", noGoalsSub:"Tap + to create your first budget book. A goal with a deadline is a plan, not a wish.", newBudgetBook:"New Budget Book", editBudgetBook:"Edit Budget Book", createBudgetBook:"Create Budget Book", deleteBudgetBook:"Delete budget book", addToBudgetBook:"Add to Budget Book", alreadySaved:"Already saved", target:"Target", name:"Name", goalComplete:"Goal complete!", remaining:"remaining", add:"Add", richySuggests:"Richard suggests", implement:"Implement", dismiss:"Dismiss", aiAdvisor:"AI Financial Advisor", aiAdvisorSub:"Personalized advice based on your real spending and expert financial wisdom.", analyzeMyFinances:"Analyze My Finances", analyzingFinances:"Analyzing your finances...", fewSeconds:"This takes a few seconds", refresh:"Refresh", insights:"Insights", analysisFailed:"Analysis failed", tryAgain:"Try Again", askYourAdvisor:"Ask Your Advisor", advisorQ1:"How can I save more?", advisorQ2:"Is my savings rate healthy?", advisorQ3:"What to do with my surplus?", thinking:"Thinking...", yesDo:"Yes, do it", notNow:"Not now", askRichard:"Ask Richard anything...", giveFeedback:"Give Richard feedback...", advisorDisclaimer:"Richard is an AI assistant, not a licensed financial advisor. Always do your own research before making money decisions.", translate:"Translate plan", noPlanYet:"No plan yet. Complete the onboarding questionnaire to get your personalized plan from Richard.", notes:"Notes", notesEmpty:"No notes yet", notesEmptySub:"Track who owes you and who you owe. Tap + to add your first one.", theyOweMe:"They owe me", iOwe:"I owe", newNote:"New Note", addNote:"Add Note", editNote:"Edit Note", saveNote:"Save Note", settle:"Settle", settleTitle:"Settle note", settleAddBalance:"Add to my balance", reminder:"Reminder", reminderTitle:"Set a reminder", setReminder:"Set reminder", clearReminder:"Clear reminder", reminderWhen:"Remind me on", reminderDenied:"Notifications are blocked. The note will still show a due badge.", due:"Due", overdue:"Overdue", deleteNote:"Delete note" },
  he: { overview:"סקירה", activity:"פעילות", budgets:"תקציבים", goals:"יעדים", advisor:"יועץ", profile:"פרופיל", language:"שפה", currency:"מטבע", yourPlan:"התוכנית שלך", categories:"קטגוריות", signOut:"התנתק", richyMember:"חבר Richy", richyRefersTo:"ריצ'י מכנה אותך", seeYourPlan:"ראה את התוכנית שלך", netBalance:"יתרה נטו", income:"הכנסות", spent:"הוצאות", topSpend:"הוצאה עיקרית", morning:"בוקר טוב", afternoon:"צהריים טובים", evening:"ערב טוב", savedThisPeriod:"נחסך בתקופה זו", redoQuestionnaire:"מלא שאלון מחדש", yourPlanByRichard:"התוכנית שלך", noTransactions:"אין עסקאות עדיין", noTransactionsSub:"לחץ + כדי לרשום. מודעות היא הצעד הראשון לעושר.", overviewEmptySub:"עשיר בבבל התחיל בלעקוב אחרי כל מטבע. התחל גם אתה בפעילות.", savingsRate:"שיעור חיסכון", excellent:"מצוין", onTrack:"במסלול", buildItUp:"שפר את זה", overspending:"הוצאה יתרה", thisPeriod:"בתקופה זו", transactions:"עסקאות", whereItWent:"לאן הלך", overLimit:"מעל המגבלה", complete:"הושלם", savedLabel:"נחסך", spentLabel:"הוצא", toGo:"לסיום", recent:"אחרון", activeGoal:"יעד פעיל", activeGoals:"יעדים פעילים", today:"היום", yesterday:"אתמול", moneyIn:"כסף נכנס", moneyOut:"כסף יוצא", newTransaction:"עסקה חדשה", editTransaction:"ערוך עסקה", addTransaction:"הוסף עסקה", saveChanges:"שמור שינויים", deleteTx:"מחק עסקה", amount:"סכום", txLabel:"תיאור", category:"קטגוריה", date:"תאריך", repeat:"חזרה", once:"פעם אחת", weekly:"שבועי", monthly:"חודשי", markPending:"סמן כממתין", expense:"הוצאה", noBudgets:"אין תקציבים עדיין", noBudgetsSub:"לחץ + להגדרת מגבלה לקטגוריה. תקציב הוא פשוט להגיד לכסף לאן ללכת.", newBudget:"תקציב חדש", editLimit:"ערוך מגבלה", addBudget:"הוסף תקציב", removeBudget:"הסר תקציב זה", totalSpent:"סך הוצאות", byCategory:"לפי קטגוריה", edit:"ערוך", delete:"מחק", save:"שמור", budgeted:"מתוקצב", monthlyLimit:"מגבלה חודשית", allCatsHaveBudget:"לכל הקטגוריות יש תקציב. הוסף קטגוריה חדשה תחילה.", noGoals:"אין ספרי תקציב עדיין", noGoalsSub:"לחץ + ליצירת ספר תקציב ראשון. יעד עם מועד הוא תוכנית, לא משאלה.", newBudgetBook:"ספר תקציב חדש", editBudgetBook:"ערוך ספר תקציב", createBudgetBook:"צור ספר תקציב", deleteBudgetBook:"מחק ספר תקציב", addToBudgetBook:"הוסף לספר תקציב", alreadySaved:"כבר נחסך", target:"יעד", name:"שם", goalComplete:"היעד הושג!", remaining:"נותר", add:"הוסף", richySuggests:"ריצ'י מציע", implement:"יישם", dismiss:"דחה", aiAdvisor:"יועץ פיננסי AI", aiAdvisorSub:"ייעוץ מותאם אישית בהתבסס על ההוצאות שלך.", analyzeMyFinances:"נתח את הכספים שלי", analyzingFinances:"מנתח את הכספים שלך...", fewSeconds:"זה לוקח כמה שניות", refresh:"רענן", insights:"תובנות", analysisFailed:"הניתוח נכשל", tryAgain:"נסה שוב", askYourAdvisor:"שאל את היועץ שלך", advisorQ1:"איך אוכל לחסוך יותר?", advisorQ2:"האם שיעור החיסכון שלי בריא?", advisorQ3:"מה לעשות עם העודף שלי?", thinking:"חושב...", yesDo:"כן, עשה זאת", notNow:"לא עכשיו", askRichard:"שאל את ריצ'רד כל דבר...", giveFeedback:"תן ל-ריצ'רד משוב...", advisorDisclaimer:"ריצ'רד הוא עוזר AI ולא יועץ פיננסי מורשה. תמיד ערוך מחקר עצמאי לפני קבלת החלטות כלכליות.", translate:"תרגם תוכנית", noPlanYet:"אין תוכנית עדיין. מלא את השאלון כדי לקבל את התוכנית האישית שלך מריצ'רד." },
  es: { overview:"Resumen", activity:"Actividad", budgets:"Presupuestos", goals:"Metas", advisor:"Asesor", profile:"Perfil", language:"Idioma", currency:"Moneda", yourPlan:"Tu Plan", categories:"Categorias", signOut:"Cerrar sesion", richyMember:"Miembro Richy", richyRefersTo:"Richy te llama", seeYourPlan:"Ver tu plan de Richard", netBalance:"Saldo Neto", income:"Ingresos", spent:"Gastado", topSpend:"Mas gastado", morning:"Buenos dias", afternoon:"Buenas tardes", evening:"Buenas noches", savedThisPeriod:"ahorrado este periodo", redoQuestionnaire:"Rehacer cuestionario", yourPlanByRichard:"Tu plan de Richard", noTransactions:"Sin transacciones aun", noTransactionsSub:"Toca + para registrar la primera. La conciencia es el primer paso a la riqueza.", overviewEmptySub:"El hombre mas rico de Babilonia empezo rastreando cada moneda. Empieza en Actividad.", savingsRate:"Tasa de ahorro", excellent:"Excelente", onTrack:"En camino", buildItUp:"Mejoralo", overspending:"Exceso de gasto", thisPeriod:"este periodo", transactions:"Transacciones", whereItWent:"A donde fue", overLimit:"sobre el limite", complete:"completo", savedLabel:"ahorrado", spentLabel:"gastado", toGo:"restante", recent:"Reciente", activeGoal:"meta activa", activeGoals:"metas activas", today:"Hoy", yesterday:"Ayer", moneyIn:"Dinero Entrada", moneyOut:"Dinero Salida", newTransaction:"Nueva Transaccion", editTransaction:"Editar Transaccion", addTransaction:"Agregar Transaccion", saveChanges:"Guardar Cambios", deleteTx:"Eliminar transaccion", amount:"Monto", txLabel:"Etiqueta", category:"Categoria", date:"Fecha", repeat:"Repetir", once:"Una vez", weekly:"Semanal", monthly:"Mensual", markPending:"Marcar como pendiente", expense:"Gasto", noBudgets:"Sin presupuestos aun", noBudgetsSub:"Toca + para establecer un limite. Un presupuesto le dice a tu dinero donde ir.", newBudget:"Nuevo Presupuesto", editLimit:"Editar Limite", addBudget:"Agregar Presupuesto", removeBudget:"Eliminar este presupuesto", totalSpent:"Total Gastado", byCategory:"Por Categoria", edit:"Editar", delete:"Eliminar", save:"Guardar", budgeted:"presupuestado", monthlyLimit:"Limite mensual", allCatsHaveBudget:"Cada categoria ya tiene presupuesto. Agrega una nueva categoria primero.", noGoals:"Sin libros de metas aun", noGoalsSub:"Toca + para crear tu primer libro de metas. Una meta con fecha limite es un plan.", newBudgetBook:"Nuevo Libro de Metas", editBudgetBook:"Editar Libro de Metas", createBudgetBook:"Crear Libro de Metas", deleteBudgetBook:"Eliminar libro de metas", addToBudgetBook:"Agregar al Libro de Metas", alreadySaved:"Ya ahorrado", target:"Objetivo", name:"Nombre", goalComplete:"Meta completada!", remaining:"restante", add:"Agregar", richySuggests:"Richard sugiere", implement:"Implementar", dismiss:"Descartar", aiAdvisor:"Asesor Financiero IA", aiAdvisorSub:"Consejos personalizados basados en tus gastos reales.", analyzeMyFinances:"Analizar Mis Finanzas", analyzingFinances:"Analizando tus finanzas...", fewSeconds:"Esto tarda unos segundos", refresh:"Actualizar", insights:"Perspectivas", analysisFailed:"Analisis fallido", tryAgain:"Intentar de nuevo", askYourAdvisor:"Pregunta a tu Asesor", advisorQ1:"Como puedo ahorrar mas?", advisorQ2:"Es saludable mi tasa de ahorro?", advisorQ3:"Que hacer con mi excedente?", thinking:"Pensando...", yesDo:"Si, hazlo", notNow:"Ahora no", askRichard:"Pregunta a Richard cualquier cosa...", giveFeedback:"Da retroalimentacion a Richard...", advisorDisclaimer:"Richard es un asistente de IA, no un asesor financiero certificado. Investiga siempre antes de tomar decisiones financieras.", translate:"Traducir plan", noPlanYet:"Aun no hay plan. Completa el cuestionario para obtener tu plan personalizado de Richard." },
  fr: { overview:"Apercu", activity:"Activite", budgets:"Budgets", goals:"Objectifs", advisor:"Conseiller", profile:"Profil", language:"Langue", currency:"Devise", yourPlan:"Votre Plan", categories:"Categories", signOut:"Deconnexion", richyMember:"Membre Richy", richyRefersTo:"Richy vous appelle", seeYourPlan:"Voir votre plan de Richard", netBalance:"Solde Net", income:"Revenus", spent:"Depenses", topSpend:"Top depenses", morning:"Bonjour", afternoon:"Bon apres-midi", evening:"Bonsoir", savedThisPeriod:"epargne cette periode", redoQuestionnaire:"Refaire le questionnaire", yourPlanByRichard:"Votre plan de Richard", noTransactions:"Aucune transaction", noTransactionsSub:"Appuyez + pour enregistrer la premiere. La conscience est le premier pas vers la richesse.", overviewEmptySub:"L homme le plus riche de Babylone commencat par suivre chaque piece. Commencez dans Activite.", savingsRate:"Taux d epargne", excellent:"Excellent", onTrack:"En bonne voie", buildItUp:"Ameliorez-le", overspending:"Depassement", thisPeriod:"cette periode", transactions:"Transactions", whereItWent:"Ou est alle", overLimit:"au-dessus de la limite", complete:"complete", savedLabel:"epargne", spentLabel:"depense", toGo:"restant", recent:"Recent", activeGoal:"objectif actif", activeGoals:"objectifs actifs", today:"Aujourd hui", yesterday:"Hier", moneyIn:"Argent entrant", moneyOut:"Argent sortant", newTransaction:"Nouvelle Transaction", editTransaction:"Modifier Transaction", addTransaction:"Ajouter Transaction", saveChanges:"Enregistrer les modifications", deleteTx:"Supprimer la transaction", amount:"Montant", txLabel:"Libelle", category:"Categorie", date:"Date", repeat:"Repetition", once:"Une fois", weekly:"Hebdomadaire", monthly:"Mensuel", markPending:"Marquer comme en attente", expense:"Depense", noBudgets:"Aucun budget", noBudgetsSub:"Appuyez + pour fixer une limite. Un budget dit a votre argent ou aller.", newBudget:"Nouveau Budget", editLimit:"Modifier Limite", addBudget:"Ajouter Budget", removeBudget:"Supprimer ce budget", totalSpent:"Total Depense", byCategory:"Par Categorie", edit:"Modifier", delete:"Supprimer", save:"Enregistrer", budgeted:"budgete", monthlyLimit:"Limite mensuelle", allCatsHaveBudget:"Chaque categorie a deja un budget. Ajoutez d abord une nouvelle categorie.", noGoals:"Aucun livret d epargne", noGoalsSub:"Appuyez + pour creer votre premier livret. Un objectif avec une echeance est un plan.", newBudgetBook:"Nouveau Livret", editBudgetBook:"Modifier Livret", createBudgetBook:"Creer Livret", deleteBudgetBook:"Supprimer le livret", addToBudgetBook:"Ajouter au Livret", alreadySaved:"Deja epargne", target:"Objectif", name:"Nom", goalComplete:"Objectif atteint!", remaining:"restant", add:"Ajouter", richySuggests:"Richard suggere", implement:"Implementer", dismiss:"Ignorer", aiAdvisor:"Conseiller Financier IA", aiAdvisorSub:"Conseils personnalises bases sur vos depenses reelles.", analyzeMyFinances:"Analyser mes Finances", analyzingFinances:"Analyse de vos finances...", fewSeconds:"Cela prend quelques secondes", refresh:"Actualiser", insights:"Perspectives", analysisFailed:"Analyse echouee", tryAgain:"Reessayer", askYourAdvisor:"Demandez a votre Conseiller", advisorQ1:"Comment puis-je economiser davantage?", advisorQ2:"Mon taux d epargne est-il sain?", advisorQ3:"Que faire avec mon surplus?", thinking:"Je reflechis...", yesDo:"Oui, fais-le", notNow:"Pas maintenant", askRichard:"Demandez a Richard n importe quoi...", giveFeedback:"Donnez vos retours a Richard...", advisorDisclaimer:"Richard est un assistant IA, pas un conseiller financier agree. Faites toujours vos propres recherches.", translate:"Traduire le plan", noPlanYet:"Pas encore de plan. Completez le questionnaire pour obtenir votre plan personnalise de Richard." },
  ar: { overview:"نظرة عامة", activity:"النشاط", budgets:"الميزانيات", goals:"الاهداف", advisor:"المستشار", profile:"الملف الشخصي", language:"اللغة", currency:"العملة", yourPlan:"خطتك", categories:"الفئات", signOut:"تسجيل الخروج", richyMember:"عضو Richy", richyRefersTo:"ريتشي يناديك", seeYourPlan:"انظر خطتك من ريتشارد", netBalance:"الرصيد الصافي", income:"الدخل", spent:"المنفق", topSpend:"اعلى انفاق", morning:"صباح الخير", afternoon:"مساء الخير", evening:"مساء الخير", savedThisPeriod:"تم توفيره", redoQuestionnaire:"اعادة الاستبيان", yourPlanByRichard:"خطتك من ريتشارد", noTransactions:"لا توجد معاملات بعد", noTransactionsSub:"اضغط + لتسجيل اول معاملة. الوعي هو الخطوة الاولى نحو الثروة.", overviewEmptySub:"اغنى رجل في بابل بدا بتتبع كل عملة. ابدا في النشاط.", savingsRate:"معدل الادخار", excellent:"ممتاز", onTrack:"في المسار", buildItUp:"طوره", overspending:"انفاق زائد", thisPeriod:"هذه الفترة", transactions:"المعاملات", whereItWent:"اين ذهب", overLimit:"فوق الحد", complete:"مكتمل", savedLabel:"مدخر", spentLabel:"انفق", toGo:"متبقي", recent:"الاخير", activeGoal:"هدف نشط", activeGoals:"اهداف نشطة", today:"اليوم", yesterday:"امس", moneyIn:"المال الداخل", moneyOut:"المال الخارج", newTransaction:"معاملة جديدة", editTransaction:"تعديل المعاملة", addTransaction:"اضافة معاملة", saveChanges:"حفظ التغييرات", deleteTx:"حذف المعاملة", amount:"المبلغ", txLabel:"التسمية", category:"الفئة", date:"التاريخ", repeat:"تكرار", once:"مرة واحدة", weekly:"اسبوعي", monthly:"شهري", markPending:"وضع علامة معلقة", expense:"مصروف", noBudgets:"لا توجد ميزانيات بعد", noBudgetsSub:"اضغط + لتعيين حد للفئة. الميزانية هي توجيه المال.", newBudget:"ميزانية جديدة", editLimit:"تعديل الحد", addBudget:"اضافة ميزانية", removeBudget:"حذف هذه الميزانية", totalSpent:"اجمالي الانفاق", byCategory:"حسب الفئة", edit:"تعديل", delete:"حذف", save:"حفظ", budgeted:"مخصص", monthlyLimit:"الحد الشهري", allCatsHaveBudget:"كل الفئات لديها ميزانية. اضف فئة جديدة اولا.", noGoals:"لا توجد دفاتر بعد", noGoalsSub:"اضغط + لانشاء اول دفتر. الهدف بموعد خطة وليس امنية.", newBudgetBook:"دفتر جديد", editBudgetBook:"تعديل الدفتر", createBudgetBook:"انشاء دفتر", deleteBudgetBook:"حذف الدفتر", addToBudgetBook:"اضافة الى الدفتر", alreadySaved:"تم الادخار مسبقا", target:"الهدف", name:"الاسم", goalComplete:"تم تحقيق الهدف!", remaining:"متبقي", add:"اضافة", richySuggests:"اقتراح ريتشارد", implement:"تطبيق", dismiss:"تجاهل", aiAdvisor:"مستشار مالي AI", aiAdvisorSub:"نصائح مخصصة بناء على انفاقك الفعلي.", analyzeMyFinances:"تحليل ماليتي", analyzingFinances:"جاري تحليل ماليتك...", fewSeconds:"هذا يستغرق بضع ثوان", refresh:"تحديث", insights:"رؤى", analysisFailed:"فشل التحليل", tryAgain:"حاول مجددا", askYourAdvisor:"اسال مستشارك", advisorQ1:"كيف يمكنني توفير المزيد؟", advisorQ2:"هل معدل توفيري صحي؟", advisorQ3:"ماذا افعل بالفائض؟", thinking:"افكر...", yesDo:"نعم افعل ذلك", notNow:"ليس الان", askRichard:"اسال ريتشارد اي شيء...", giveFeedback:"اعطِ ريتشارد ملاحظاتك...", advisorDisclaimer:"ريتشارد مساعد ذكاء اصطناعي وليس مستشارا ماليا معتمدا. دائما ابحث قبل اتخاذ قرارات مالية.", translate:"ترجمة الخطة", noPlanYet:"لا توجد خطة بعد. اكمل الاستبيان للحصول على خطتك الشخصية من ريتشارد." },
  ru: { overview:"Обзор", activity:"Активность", budgets:"Бюджеты", goals:"Цели", advisor:"Советник", profile:"Профиль", language:"Язык", currency:"Валюта", yourPlan:"Ваш план", categories:"Категории", signOut:"Выйти", richyMember:"Участник Richy", richyRefersTo:"Richy называет тебя", seeYourPlan:"Посмотреть план от Ричарда", netBalance:"Чистый баланс", income:"Доходы", spent:"Расходы", topSpend:"Главная трата", morning:"Доброе утро", afternoon:"Добрый день", evening:"Добрый вечер", savedThisPeriod:"сохранено за период", redoQuestionnaire:"Пройти снова", yourPlanByRichard:"Ваш план от Ричарда", noTransactions:"Нет транзакций", noTransactionsSub:"Нажмите + чтобы добавить первую. Осознанность - первый шаг к богатству.", overviewEmptySub:"Богатейший человек Вавилона начал с учёта каждой монеты. Начните в Активности.", savingsRate:"Уровень сбережений", excellent:"Отлично", onTrack:"В норме", buildItUp:"Улучшайте", overspending:"Перерасход", thisPeriod:"за период", transactions:"Транзакции", whereItWent:"Куда ушло", overLimit:"сверх лимита", complete:"завершено", savedLabel:"накоплено", spentLabel:"потрачено", toGo:"осталось", recent:"Последние", activeGoal:"активная цель", activeGoals:"активных целей", today:"Сегодня", yesterday:"Вчера", moneyIn:"Доходы", moneyOut:"Расходы", newTransaction:"Новая транзакция", editTransaction:"Редактировать", addTransaction:"Добавить транзакцию", saveChanges:"Сохранить изменения", deleteTx:"Удалить транзакцию", amount:"Сумма", txLabel:"Описание", category:"Категория", date:"Дата", repeat:"Повтор", once:"Однократно", weekly:"Еженедельно", monthly:"Ежемесячно", markPending:"Отметить как ожидающее", expense:"Расход", noBudgets:"Нет бюджетов", noBudgetsSub:"Нажмите + чтобы задать лимит. Бюджет говорит деньгам куда идти.", newBudget:"Новый бюджет", editLimit:"Изменить лимит", addBudget:"Добавить бюджет", removeBudget:"Удалить этот бюджет", totalSpent:"Всего потрачено", byCategory:"По категориям", edit:"Редактировать", delete:"Удалить", save:"Сохранить", budgeted:"запланировано", monthlyLimit:"Месячный лимит", allCatsHaveBudget:"Все категории уже имеют бюджет. Сначала добавьте новую категорию.", noGoals:"Нет книг целей", noGoalsSub:"Нажмите + чтобы создать первую. Цель с датой - это план, а не мечта.", newBudgetBook:"Новая книга целей", editBudgetBook:"Редактировать книгу целей", createBudgetBook:"Создать книгу целей", deleteBudgetBook:"Удалить книгу целей", addToBudgetBook:"Добавить в книгу целей", alreadySaved:"Уже накоплено", target:"Цель", name:"Название", goalComplete:"Цель достигнута!", remaining:"осталось", add:"Добавить", richySuggests:"Ричард предлагает", implement:"Применить", dismiss:"Отклонить", aiAdvisor:"Финансовый советник ИИ", aiAdvisorSub:"Персональные советы на основе ваших расходов.", analyzeMyFinances:"Анализировать мои финансы", analyzingFinances:"Анализируем ваши финансы...", fewSeconds:"Это займет несколько секунд", refresh:"Обновить", insights:"Инсайты", analysisFailed:"Анализ не удался", tryAgain:"Попробовать снова", askYourAdvisor:"Спросите вашего советника", advisorQ1:"Как сэкономить больше?", advisorQ2:"Мой уровень сбережений здоровый?", advisorQ3:"Что делать с излишком?", thinking:"Думаю...", yesDo:"Да, сделай это", notNow:"Не сейчас", askRichard:"Спросите Ричарда что угодно...", giveFeedback:"Дайте обратную связь Ричарду...", advisorDisclaimer:"Ричард является ИИ-помощником, а не лицензированным финансовым советником. Всегда проводите собственное исследование.", translate:"Перевести план", noPlanYet:"Noch kein Plan. Fullen Sie den Fragebogen aus, um Ihren personlichen Plan von Richard zu erhalten." },
  de: { overview:"Ubersicht", activity:"Aktivitat", budgets:"Budgets", goals:"Ziele", advisor:"Berater", profile:"Profil", language:"Sprache", currency:"Wahrung", yourPlan:"Ihr Plan", categories:"Kategorien", signOut:"Abmelden", richyMember:"Richy-Mitglied", richyRefersTo:"Richy nennt dich", seeYourPlan:"Sehen Sie Ihren Plan von Richard", netBalance:"Nettosaldo", income:"Einnahmen", spent:"Ausgaben", topSpend:"Ausgabe", morning:"Guten Morgen", afternoon:"Guten Tag", evening:"Guten Abend", savedThisPeriod:"gespart in dieser Periode", redoQuestionnaire:"Fragebogen wiederholen", yourPlanByRichard:"Ihr Plan von Richard", noTransactions:"Noch keine Transaktionen", noTransactionsSub:"Tippe + um die erste zu erfassen. Bewusstsein ist der erste Schritt zum Reichtum.", overviewEmptySub:"Der reichste Mann Babylons begann damit, jede Muenze zu verfolgen. Starte in Aktivitat.", savingsRate:"Sparrate", excellent:"Ausgezeichnet", onTrack:"Auf Kurs", buildItUp:"Verbessern", overspending:"Mehrausgaben", thisPeriod:"diese Periode", transactions:"Transaktionen", whereItWent:"Wo es hinging", overLimit:"uber dem Limit", complete:"abgeschlossen", savedLabel:"gespart", spentLabel:"ausgegeben", toGo:"verbleibend", recent:"Aktuell", activeGoal:"aktives Ziel", activeGoals:"aktive Ziele", today:"Heute", yesterday:"Gestern", moneyIn:"Einnahmen", moneyOut:"Ausgaben", newTransaction:"Neue Transaktion", editTransaction:"Transaktion bearbeiten", addTransaction:"Transaktion hinzufugen", saveChanges:"Anderungen speichern", deleteTx:"Transaktion loschen", amount:"Betrag", txLabel:"Bezeichnung", category:"Kategorie", date:"Datum", repeat:"Wiederholung", once:"Einmalig", weekly:"Wochentlich", monthly:"Monatlich", markPending:"Als ausstehend markieren", expense:"Ausgabe", noBudgets:"Noch keine Budgets", noBudgetsSub:"Tippe + um ein Limit festzulegen. Ein Budget sagt deinem Geld wo es hingehen soll.", newBudget:"Neues Budget", editLimit:"Limit bearbeiten", addBudget:"Budget hinzufugen", removeBudget:"Dieses Budget entfernen", totalSpent:"Gesamt ausgegeben", byCategory:"Nach Kategorie", edit:"Bearbeiten", delete:"Loschen", save:"Speichern", budgeted:"budgetiert", monthlyLimit:"Monatliches Limit", allCatsHaveBudget:"Alle Kategorien haben bereits ein Budget. Zuerst neue Kategorie hinzufugen.", noGoals:"Noch keine Sparbuecher", noGoalsSub:"Tippe + um dein erstes Sparbuch zu erstellen. Ein Ziel mit Termin ist ein Plan, kein Wunsch.", newBudgetBook:"Neues Sparbuch", editBudgetBook:"Sparbuch bearbeiten", createBudgetBook:"Sparbuch erstellen", deleteBudgetBook:"Sparbuch loschen", addToBudgetBook:"Zum Sparbuch hinzufugen", alreadySaved:"Bereits gespart", target:"Ziel", name:"Name", goalComplete:"Ziel erreicht!", remaining:"verbleibend", add:"Hinzufugen", richySuggests:"Richard schlagt vor", implement:"Umsetzen", dismiss:"Ablehnen", aiAdvisor:"KI-Finanzberater", aiAdvisorSub:"Personalisierte Ratschlage basierend auf Ihren Ausgaben.", analyzeMyFinances:"Meine Finanzen analysieren", analyzingFinances:"Ihre Finanzen werden analysiert...", fewSeconds:"Dies dauert einige Sekunden", refresh:"Aktualisieren", insights:"Einblicke", analysisFailed:"Analyse fehlgeschlagen", tryAgain:"Erneut versuchen", askYourAdvisor:"Fragen Sie Ihren Berater", advisorQ1:"Wie kann ich mehr sparen?", advisorQ2:"Ist meine Sparrate gesund?", advisorQ3:"Was tun mit meinem Uberschuss?", thinking:"Denke nach...", yesDo:"Ja, mach es", notNow:"Nicht jetzt", askRichard:"Fragen Sie Richard alles...", giveFeedback:"Geben Sie Richard Feedback...", advisorDisclaimer:"Richard ist ein KI-Assistent, kein lizenzierter Finanzberater. Recherchieren Sie stets selbst vor Finanzentscheidungen.", translate:"Plan ubersetzen", noPlanYet:"Noch kein Plan. Fullen Sie den Fragebogen aus um Ihren personlichen Plan von Richard zu erhalten." },
  pt: { overview:"Visao Geral", activity:"Atividade", budgets:"Orcamentos", goals:"Metas", advisor:"Consultor", profile:"Perfil", language:"Idioma", currency:"Moeda", yourPlan:"Seu Plano", categories:"Categorias", signOut:"Sair", richyMember:"Membro Richy", richyRefersTo:"Richy te chama", seeYourPlan:"Ver seu plano de Richard", netBalance:"Saldo Liquido", income:"Receita", spent:"Gasto", topSpend:"Principal gasto", morning:"Bom dia", afternoon:"Boa tarde", evening:"Boa noite", savedThisPeriod:"economizado neste periodo", redoQuestionnaire:"Refazer questionario", yourPlanByRichard:"Seu plano de Richard", noTransactions:"Nenhuma transacao ainda", noTransactionsSub:"Toque + para registrar a primeira. Consciencia e o primeiro passo para a riqueza.", overviewEmptySub:"O homem mais rico da Babilonia comecou rastreando cada moeda. Comece em Atividade.", savingsRate:"Taxa de Poupanca", excellent:"Excelente", onTrack:"No caminho", buildItUp:"Melhore", overspending:"Excesso de gastos", thisPeriod:"este periodo", transactions:"Transacoes", whereItWent:"Para onde foi", overLimit:"acima do limite", complete:"concluido", savedLabel:"economizado", spentLabel:"gasto", toGo:"restante", recent:"Recente", activeGoal:"meta ativa", activeGoals:"metas ativas", today:"Hoje", yesterday:"Ontem", moneyIn:"Entrada", moneyOut:"Saida", newTransaction:"Nova Transacao", editTransaction:"Editar Transacao", addTransaction:"Adicionar Transacao", saveChanges:"Salvar Alteracoes", deleteTx:"Excluir transacao", amount:"Valor", txLabel:"Rotulo", category:"Categoria", date:"Data", repeat:"Repeticao", once:"Uma vez", weekly:"Semanal", monthly:"Mensal", markPending:"Marcar como pendente", expense:"Despesa", noBudgets:"Nenhum orcamento ainda", noBudgetsSub:"Toque + para definir um limite. Um orcamento e dizer ao seu dinheiro para onde ir.", newBudget:"Novo Orcamento", editLimit:"Editar Limite", addBudget:"Adicionar Orcamento", removeBudget:"Remover este orcamento", totalSpent:"Total Gasto", byCategory:"Por Categoria", edit:"Editar", delete:"Excluir", save:"Salvar", budgeted:"orcado", monthlyLimit:"Limite mensal", allCatsHaveBudget:"Cada categoria ja tem um orcamento. Adicione uma nova categoria primeiro.", noGoals:"Nenhum caderno de metas ainda", noGoalsSub:"Toque + para criar seu primeiro caderno. Uma meta com prazo e um plano.", newBudgetBook:"Novo Caderno de Metas", editBudgetBook:"Editar Caderno de Metas", createBudgetBook:"Criar Caderno de Metas", deleteBudgetBook:"Excluir caderno de metas", addToBudgetBook:"Adicionar ao Caderno de Metas", alreadySaved:"Ja economizado", target:"Meta", name:"Nome", goalComplete:"Meta concluida!", remaining:"restante", add:"Adicionar", richySuggests:"Richard sugere", implement:"Implementar", dismiss:"Dispensar", aiAdvisor:"Consultor Financeiro IA", aiAdvisorSub:"Conselhos personalizados com base nos seus gastos reais.", analyzeMyFinances:"Analisar Minhas Financas", analyzingFinances:"Analisando suas financas...", fewSeconds:"Isso leva alguns segundos", refresh:"Atualizar", insights:"Perspectivas", analysisFailed:"Analise falhou", tryAgain:"Tentar novamente", askYourAdvisor:"Pergunte ao seu Consultor", advisorQ1:"Como posso economizar mais?", advisorQ2:"Minha taxa de poupanca e saudavel?", advisorQ3:"O que fazer com meu excedente?", thinking:"Pensando...", yesDo:"Sim, faca isso", notNow:"Agora nao", askRichard:"Pergunte a Richard qualquer coisa...", giveFeedback:"Dar feedback a Richard...", advisorDisclaimer:"Richard e um assistente de IA, nao um consultor financeiro licenciado. Sempre pesquise antes de tomar decisoes financeiras.", translate:"Traduzir plano", noPlanYet:"Ainda sem plano. Complete o questionario para obter seu plano personalizado de Richard." }
};
function tr(key) {
  var code = _lang.code || "en";
  return (TRANSLATIONS[code] && TRANSLATIONS[code][key]) || (TRANSLATIONS.en[key]) || key;
}

function fmtCur(sym, n) {
  var abs = Math.abs(n || 0);
  return (sym || "$") + abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function dollars(n) {
  return fmtCur(_currency.sym, n);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Offline fallback rates, expressed as units of each currency per 1 USD.
// Only used when the live FX request fails (no network). rate(from -> to) = USD[to] / USD[from].
var FX_FALLBACK = { USD: 1, EUR: 0.92, GBP: 0.79, ILS: 3.70, JPY: 150 };
var _fxCache = {};

function fxStaticRate(fromSym, toSym) {
  var f = SYM_TO_CODE[fromSym], t = SYM_TO_CODE[toSym];
  var fu = FX_FALLBACK[f], tu = FX_FALLBACK[t];
  if (!fu || !tu) return 1;
  return tu / fu;
}

// Resolve how many units of toSym equal one fromSym. Calls cb(rate, usedFallback).
// Live rates come from frankfurter (ECB-based, no key, CORS-friendly); cached per session.
function fetchRate(fromSym, toSym, cb) {
  if (fromSym === toSym) { cb(1, false); return; }
  var from = SYM_TO_CODE[fromSym], to = SYM_TO_CODE[toSym];
  if (!from || !to) { cb(fxStaticRate(fromSym, toSym), true); return; }
  var key = from + "_" + to;
  if (_fxCache[key]) { cb(_fxCache[key], false); return; }
  fetch("https://api.frankfurter.dev/v1/latest?base=" + from + "&symbols=" + to)
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var rate = d && d.rates && d.rates[to];
      if (typeof rate === "number" && rate > 0) { _fxCache[key] = rate; cb(rate, false); }
      else { cb(fxStaticRate(fromSym, toSym), true); }
    })
    .catch(function() { cb(fxStaticRate(fromSym, toSym), true); });
}

function hashPass(pw) {
  var h = 5381;
  for (var i = 0; i < pw.length; i++) {
    h = ((h << 5) + h) + pw.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

// New accounts start with no budgets - the user adds them with the + button.
var DEFAULT_BUDGETS = [];
function freshCategories() { return DEFAULT_CATEGORIES.map(function(c) { return { id: c.id, name: c.name, color: c.color, icon: c.icon, folderId: c.folderId }; }); }
function freshFolders() { return DEFAULT_FOLDERS.map(function(f) { return { id: f.id, name: f.name }; }); }

// Cloud backend: Firebase Authentication owns identity + sessions, and Cloud
// Firestore stores one document per user (collection "users", keyed by the
// Firebase uid) holding their whole data blob. The web config lives in
// firebase-init.js and is loaded by preview.html before this app runs; security
// is enforced by Firestore rules, not by hiding the config. cloudReady() guards
// every call so the app can still boot and explain itself before setup is done.
function _fb() {
  return (typeof window !== "undefined" && window.firebase) ? window.firebase : null;
}
function cloudReady() {
  var f = _fb();
  return !!(f && f.apps && f.apps.length);
}
function _auth() { return _fb().auth(); }
function _fsdb() { return _fb().firestore(); }

var CLOUD = {
  // Subscribe to sign-in state. cb receives the Firebase user (or null). Returns
  // an unsubscribe function. Fires once immediately with the restored session.
  onAuth: function(cb) {
    if (!cloudReady()) { cb(null); return function () {}; }
    return _auth().onAuthStateChanged(cb);
  },
  signUp: function(email, password) {
    return _auth().createUserWithEmailAndPassword(email, password);
  },
  signIn: function(email, password) {
    return _auth().signInWithEmailAndPassword(email, password);
  },
  signInGoogle: function() {
    var provider = new (_fb().auth.GoogleAuthProvider)();
    return _auth().signInWithPopup(provider);
  },
  signOut: function() {
    return cloudReady() ? _auth().signOut() : Promise.resolve();
  },
  loadUser: function(uid) {
    return _fsdb().collection("users").doc(uid).get().then(function (snap) {
      return snap.exists ? snap.data() : null;
    });
  },
  saveUser: function(uid, data) {
    if (!cloudReady() || !uid) return Promise.resolve();
    return _fsdb().collection("users").doc(uid).set(data);
  },
};

function Card(props) {
  return (
    <div style={Object.assign({
      background: props.glass ? T.glass : T.card,
      borderRadius: 20,
      boxShadow: props.glass
        ? "0 2px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)"
        : "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.07)",
      backdropFilter: props.glass ? "blur(20px)" : "none",
      WebkitBackdropFilter: props.glass ? "blur(20px)" : "none",
    }, props.style)}>
      {props.children}
    </div>
  );
}

function RichyLogo(props) {
  var size = props.size || 40;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={props.style || {}}>
      <rect width="100" height="100" rx={22} fill="#141210" />
      <text x="50" y="76" textAnchor="middle" fontFamily={"Georgia, 'Times New Roman', serif"} fontSize="72" fontWeight="700" fill="#C9A234">R</text>
    </svg>
  );
}

function SVGIcon(props) {
  var size = props.size || 22;
  var color = props.color || T.ink2;
  var icons = {
    overview: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
    activity: "M22 12h-4l-3 9L9 3l-3 9H2",
    budgets:  "M2 7h20M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zm4 4v10",
    goals:    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-6a4 4 0 100-8 4 4 0 000 8zm0 0v2",
    advisor:  "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8m9-4l-2 2-1-1",
    user:     "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8",
    lock:     "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-7 4v3M8 11V7a4 4 0 018 0v4",
    plus:     "M12 5v14M5 12h14",
    trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
    up:       "M12 19V5m-7 7l7-7 7 7",
    down:     "M12 5v14m7-7l-7 7-7-7",
    eye:      "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
    eyeoff:   "M17.94 17.94A10 10 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9 9 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22",
    logout:   "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
    refresh:  "M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15",
    check:    "M20 6L9 17l-5-5",
    spark:    "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    search:   "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    flag:     "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
    folder:   "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z",
    tag:      "M3 12l9-9 9 9-9 9-9-9zM7.5 7.5h.01",
    categories:"M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2.5 12.5V3.5h9l8.6 8.6a2 2 0 010 2.8zM7 7.5h.01",
    chevron:  "M9 6l6 6-6 6",
    edit:     "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
    mail:     "M3 5h18a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1zM3 7l9 6 9-6",
    calendar: "M3 5h18v16H3zM3 9h18M8 3v4M16 3v4",
    note:     "M6 2h9l5 5v15H6zM14 2v5h5M9 13h6M9 17h4",
    shield:   "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z",
    // Category banner icons
    home:     "M3 10.5L12 3l9 7.5M5 9.2V20h14V9.2",
    food:     "M7 3v8a2 2 0 01-4 0V3M5 11v10M17 3c-1.6 0-2.5 2.4-2.5 5s.9 4 2.5 4v9",
    car:      "M5 11l1.6-4.4A2 2 0 018.5 5h7a2 2 0 011.9 1.6L19 11M4.5 11h15v5h-15zM8 16v2M16 16v2",
    heart:    "M12 20.5S3.5 15 3.5 9.2A4.2 4.2 0 0112 6a4.2 4.2 0 018.5 3.2C20.5 15 12 20.5 12 20.5z",
    film:     "M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4",
    cart:     "M2.5 4h2l2.3 11h10l1.9-8H6M9.5 19a1 1 0 100 2 1 1 0 000-2M16.5 19a1 1 0 100 2 1 1 0 000-2",
    plane:    "M21 15.5l-8.5-4.5V4.5a1.5 1.5 0 00-3 0V11L1 15.5v2l8.5-2.4V19l-2.2 1.6V22l3.7-1 3.7 1v-1.4L12.5 19v-3.9l8.5 2.4z",
    briefcase:"M3 8h18v12H3zM8 8V6a2 2 0 012-2h4a2 2 0 012 2v2M3 13h18",
    chart:    "M3 3v18h18M7 14l3.5-4.5 3 2.5L21 7",
    coins:    "M4 7c0-1.4 2.7-2.5 6-2.5S16 5.6 16 7s-2.7 2.5-6 2.5S4 8.4 4 7zM4 7v5c0 1.4 2.7 2.5 6 2.5M8 13.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5M8 13.5C8 12.1 10.7 11 14 11s6 1.1 6 2.5v5c0 1.4-2.7 2.5-6 2.5s-6-1.1-6-2.5z",
    gift:     "M20 12v8.5H4V12M2.5 7.5h19V12h-19zM12 21V7.5M12 7.5H7.8a2.4 2.4 0 010-4.7C11 2.8 12 7.5 12 7.5zM12 7.5h4.2a2.4 2.4 0 000-4.7C13 2.8 12 7.5 12 7.5z",
    box:      "M21 8l-9-5-9 5 9 5 9-5zM3 8v8.5l9 5 9-5V8M12 13v8.5",
    coffee:   "M3 8h14v4a5 5 0 01-5 5H8a5 5 0 01-5-5zM17 9h2.5a2.5 2.5 0 010 5H17M7 3.5V5M10 3.5V5M13 3.5V5",
    book:     "M4 4.5A1.5 1.5 0 015.5 3H19a1 1 0 011 1v14.5M5.5 18H20a1 1 0 010 2H5.5A1.5 1.5 0 014 18.5v-14",
    dumbbell: "M6.5 6.5v11M4 8.5v7M17.5 6.5v11M20 8.5v7M6.5 12h11",
    phone:    "M7 2.5h10a1 1 0 011 1v17a1 1 0 01-1 1H7a1 1 0 01-1-1v-17a1 1 0 011-1zM10.5 18.5h3",
    music:    "M9 18V5l11-2v12M9 18a3 3 0 11-6 0 3 3 0 016 0zM20 15a3 3 0 11-6 0 3 3 0 016 0z",
    leaf:     "M11 20.5A7.5 7.5 0 013.5 13C3.5 6.5 11.5 3.5 20.5 3.5c0 8.5-3 17-9.5 17zM11 20.5c0-5.5 2.5-9.5 6.5-12.5",
    laptop:   "M4 6h16v10H4zM2 19h20M9.5 19l.7-3h3.6l.7 3",
    sun:      "M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 6a6 6 0 100 12A6 6 0 0012 6z",
    star:     "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    droplet:  "M12 3S6 10.5 6 15a6 6 0 0012 0c0-4.5-6-12-6-12z",
    tool:     "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94z",
    credit:   "M2 5h20v14H2zM2 10h20M6 15h4",
    building: "M3 22h18M3 7l9-5 9 5v15H3V7zM9 22v-8h6v8",
    bike:     "M5.5 17.5a3 3 0 100-6 3 3 0 000 6zM18.5 17.5a3 3 0 100-6 3 3 0 000 6zM9 14.5l3-6 2.5 3.5h4M14.5 11.5l-6.5 3",
    shirt:    "M20 5.6L17 3h-4l-1 1.5L11 3H7L4 5.6 2 9l4 1v10h16V10l4-1-2-3.4z",
    wifi:     "M5.2 13.8a9.5 9.5 0 0113.6 0M1.4 9.4a15 15 0 0121.2 0M8.8 17.2a5 5 0 016.4 0M12 21h.01",
    tv:       "M2 7h20v13H2zM8 3l4 4 4-4",
    umbrella: "M23 12a11 11 0 00-22 0M12 12v8a2 2 0 004 0",
  };
  var d = icons[props.id] || "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function ProgressBar(props) {
  var pct = Math.min(100, (props.value / (props.max || 1)) * 100);
  return (
    <div style={{ background: "rgba(0,0,0,0.07)", borderRadius: props.h || 4, height: props.h || 4, overflow: "hidden" }}>
      <div style={{
        width: pct + "%",
        height: "100%",
        borderRadius: props.h || 4,
        background: props.value > props.max ? T.red : (props.color || T.orange),
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

function RingChart(props) {
  var size = props.size || 60;
  var stroke = props.stroke || 5;
  var r = (size - stroke * 2) / 2;
  var circ = 2 * Math.PI * r;
  var pct = Math.min(1, props.value / (props.max || 1));
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={props.color || T.orange} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" />
    </svg>
  );
}

function IconBadge(props) {
  var size = props.size || 38;
  var r = Math.round(size * 0.27);
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: props.bg, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 10px rgba(0,0,0,0.18)",
    }}>
      <SVGIcon id={props.icon || (props.label === "+" ? "up" : "down")} size={size * 0.48} color="#fff" />
    </div>
  );
}

function Overlay(props) {
  if (!props.open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90 }}>
      <div onClick={props.onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(20,18,16,0.32)",
        backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "100%", maxWidth: 430,
        maxHeight: "88vh", overflowY: "auto",
        background: "#F8F6F1",
        borderRadius: "24px 24px 0 0",
        boxShadow: "0 -4px 40px rgba(20,18,16,0.22)",
        paddingBottom: 30,
      }}>
        <div style={{ width: 38, height: 5, borderRadius: 3, background: T.orangeDim, margin: "9px auto 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 8px" }}>
          <span style={{ fontSize: 18, fontWeight: 700, fontFamily: DISP, color: T.ink, letterSpacing: "-0.02em" }}>{props.title}</span>
          <button onClick={props.onClose} style={{
            background: T.orangeDim, border: "none", borderRadius: "50%",
            width: 30, height: 30, cursor: "pointer", fontSize: 18, color: T.orange,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>x</button>
        </div>
        <div style={{ padding: "2px 20px 0" }}>{props.children}</div>
      </div>
    </div>
  );
}

function FormRow(props) {
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 13, padding: "9px 14px", marginBottom: props.last ? 0 : 7 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI, marginBottom: 3 }}>
        {props.label}
      </div>
      {props.opts ? (
        <select value={props.value} onChange={props.onChange} style={{ width: "100%", border: "none", background: "none", fontSize: 15, color: T.ink, fontFamily: UI, outline: "none", padding: 0 }}>
          {props.opts.map(function(o) { return <option key={o}>{o}</option>; })}
        </select>
      ) : (
        <input type={props.type || "text"} value={props.value} onChange={props.onChange} placeholder={props.placeholder || ""}
          style={{ width: "100%", border: "none", background: "none", fontSize: 15, color: T.ink, fontFamily: UI, outline: "none", padding: 0, boxSizing: "border-box" }} />
      )}
    </div>
  );
}

function BigBtn(props) {
  return (
    <button onClick={props.disabled ? undefined : props.onPress}
      style={{
        width: "100%",
        background: props.disabled ? "rgba(0,0,0,0.10)" : (props.color || T.orange),
        color: props.disabled ? T.ink3 : "#fff",
        border: "none", borderRadius: 14, padding: "13px 0",
        fontSize: 16, fontFamily: UI, fontWeight: 700,
        cursor: props.disabled ? "default" : "pointer",
        marginTop: 10,
        boxShadow: props.disabled ? "none" : "0 4px 14px rgba(217,121,65,0.4)",
      }}>
      {props.label}
    </button>
  );
}

function CatBadge(props) {
  var size = props.size || 38;
  var r = Math.round(size * 0.28);
  var soft = props.soft;
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: soft ? (props.color + "1F") : props.color, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: soft ? "none" : "0 2px 8px " + props.color + "55",
    }}>
      <SVGIcon id={props.icon || "box"} size={Math.round(size * 0.5)} color={soft ? props.color : "#fff"} />
    </div>
  );
}

// Progressive-disclosure category picker. Collapsed by default to a single calm
// row showing the selected category; tap to reveal a calm wrap grid of all of
// them; picking one collapses it back. Lighter and less overwhelming than a strip
// of saturated badges. Shared by the transaction add/edit forms and the budget form.
function CatPicker(props) {
  var _o = useState(false);
  var open = _o[0]; var setOpen = _o[1];
  var cats = props.categories || [];
  var sel = null;
  cats.forEach(function(c) { if (c.id === props.value) sel = c; });
  if (!sel) sel = cats[0] || null;
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 13, padding: "9px 14px", marginBottom: props.last ? 0 : 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI }}>
          {props.label || "Category"}
        </div>
        {props.onManage && (
          <button onClick={props.onManage} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 10.5, fontWeight: 600, color: T.orange, fontFamily: UI }}>
            Manage
          </button>
        )}
      </div>
      {!sel ? (
        <div style={{ fontSize: 13, color: T.ink3, fontFamily: UI, padding: "4px 0" }}>No categories</div>
      ) : !open ? (
        <button onClick={function() { setOpen(true); }}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, background: "none", border: "none", cursor: "pointer", padding: "2px 0", fontFamily: UI }}>
          <CatBadge icon={sel.icon} color={sel.color} size={30} soft={true} />
          <span style={{ flex: 1, minWidth: 0, textAlign: "left", fontSize: 15, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel.name}</span>
          <span style={{ flexShrink: 0, transform: "rotate(90deg)", display: "flex", color: T.ink3 }}>
            <SVGIcon id="chevron" size={14} color={T.ink3} />
          </span>
        </button>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, paddingTop: 1 }}>
          {cats.map(function(c) {
            var active = c.id === props.value;
            return (
              <button key={c.id} onClick={function() { props.onChange(c.id); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px 5px 6px", borderRadius: 11, cursor: "pointer", fontFamily: UI,
                  background: active ? (c.color + "1F") : "rgba(0,0,0,0.04)",
                  border: active ? "1.5px solid " + c.color : "1.5px solid transparent" }}>
                <CatBadge icon={c.icon} color={c.color} size={22} soft={true} />
                <span style={{ fontSize: 12.5, fontWeight: active ? 700 : 500, color: active ? T.ink : T.ink2, whiteSpace: "nowrap" }}>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Hero amount entry: the focal point of the transaction form. Combines the amount,
// the currency symbol prefix, the currency picker, and the live-converted total into
// one rich block so the form has hierarchy instead of a stack of equal gray boxes.
function AmountField(props) {
  var foreign = props.cur && props.cur !== props.mainSym;
  var amtNum = parseFloat(props.value) || 0;
  var conv = amtNum * (props.rate || 1);
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "11px 15px 12px", marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3, minHeight: 14 }}>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: UI }}>{tr("amount")}</span>
        {foreign && (
          <span style={{ fontSize: 12, fontWeight: 700, color: T.ink2, fontFamily: UI, letterSpacing: "-0.01em" }}>
            {props.rateLoading ? "..." : ("= " + fmtCur(props.mainSym, conv))}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 26, fontWeight: 700, color: amtNum > 0 ? T.ink2 : T.ink3, fontFamily: UI, lineHeight: 1 }}>{props.cur}</span>
        <input type="number" value={props.value} onChange={props.onAmount} placeholder="0.00"
          style={{ flex: 1, minWidth: 0, border: "none", background: "none", fontSize: 26, fontWeight: 700, color: T.ink, fontFamily: UI, outline: "none", padding: 0, letterSpacing: "-0.03em" }} />
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 11 }}>
        {CURRENCY_OPTIONS.map(function(o) {
          var on = o.sym === props.cur;
          return (
            <button key={o.sym} onClick={function() { props.onCur(o.sym); }}
              style={{ flex: 1, padding: "6px 0", borderRadius: 9, border: "none", cursor: "pointer", fontFamily: UI,
                background: on ? T.orangeDim : "rgba(0,0,0,0.05)", color: on ? T.orange : T.ink3 }}>
              <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{o.sym}</div>
              <div style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: "0.04em", marginTop: 2 }}>{o.code}</div>
            </button>
          );
        })}
      </div>
      {foreign && !props.rateLoading && (
        <div style={{ fontSize: 11, color: T.ink3, fontWeight: 500, fontFamily: UI, marginTop: 8 }}>
          {"1 " + props.cur + " = " + props.mainSym + (props.rate || 1).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: (props.rate || 1) < 1 ? 4 : 2 }) + (props.rateFallback ? "   (offline rate)" : "")}
        </div>
      )}
    </div>
  );
}

// EmailJS - sends the real verification code to the user's inbox from the browser.
// Public key only; safe to ship client-side. The 6-digit check happens in-app.
var EMAILJS = { service: "service_rl7nf3i", template: "template_q6oxfcp", publicKey: "uqJTHn1oiuh_eKsEs" };

// Real Google Sign-In via Google Identity Services. The Client ID is public by
// design (safe to ship). Authorized origins are set in Google Cloud Console.
var GOOGLE_CLIENT_ID = "40841723141-jl627i43bq6vts956hd9gntlk6v50i53.apps.googleusercontent.com";

// Decode the payload of a Google ID token (JWT) to read email and name.
// We trust the token because GIS handed it to us directly in-browser.
function decodeJwt(token) {
  try {
    var parts = token.split(".");
    if (parts.length < 2) return null;
    var b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) { b64 += "="; }
    var bin = atob(b64);
    var json = decodeURIComponent(bin.split("").map(function(c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(""));
    return JSON.parse(json);
  } catch (e) { return null; }
}

function genCode() {
  var s = "";
  for (var i = 0; i < 6; i++) { s += Math.floor(Math.random() * 10); }
  return s;
}

function sendVerificationEmail(email, code) {
  return fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS.service,
      template_id: EMAILJS.template,
      user_id: EMAILJS.publicKey,
      template_params: {
        code: code,
        email: email,
        to_email: email,
        user_email: email,
        to: email,
        recipient: email,
        reply_to: email,
      },
    }),
  });
}

function isEmail(s) {
  var t = (s || "").trim();
  return t.indexOf("@") > 0 && t.indexOf(".", t.indexOf("@")) > t.indexOf("@") + 1 && t.length >= 6;
}

var CLOUD_SETUP_MSG = "Cloud sign-in is not configured yet. Add your Firebase keys in firebase-init.js.";

// Turn a Firebase auth error into a short, human message.
function authMsg(err) {
  var c = (err && err.code) ? err.code : "";
  if (c === "auth/wrong-password" || c === "auth/invalid-credential") return "Wrong email or password.";
  if (c === "auth/user-not-found") return "No account found with that email. Create one first.";
  if (c === "auth/invalid-email") return "That email doesn't look right.";
  if (c === "auth/email-already-in-use") return "An account already uses this email. Sign in instead.";
  if (c === "auth/weak-password") return "Password must be at least 6 characters.";
  if (c === "auth/too-many-requests") return "Too many attempts. Wait a moment and try again.";
  if (c === "auth/network-request-failed") return "Network error. Check your connection and try again.";
  if (c === "auth/popup-blocked") return "Your browser blocked the Google popup. Allow popups and retry.";
  if (c === "auth/operation-not-allowed") return "This sign-in method isn't enabled in Firebase yet.";
  return (err && err.message) ? err.message : "Something went wrong. Please try again.";
}

function AuthScreen(props) {
  var _s = useState("login");
  var step = _s[0]; var setStep = _s[1];
  var _e = useState("");
  var email = _e[0]; var setEmail = _e[1];
  var _p = useState("");
  var password = _p[0]; var setPW = _p[1];
  var _p2 = useState("");
  var password2 = _p2[0]; var setPW2 = _p2[1];
  var _fn = useState("");
  var fullName = _fn[0]; var setFullName = _fn[1];
  var _dob = useState("");
  var dob = _dob[0]; var setDob = _dob[1];
  var _ci = useState("");
  var codeInput = _ci[0]; var setCodeInput = _ci[1];
  var _sc = useState("");
  var sentCode = _sc[0]; var setSentCode = _sc[1];
  var _er = useState("");
  var error = _er[0]; var setError = _er[1];
  var _nt = useState("");
  var notice = _nt[0]; var setNotice = _nt[1];
  var _b = useState(false);
  var busy = _b[0]; var setBusy = _b[1];
  var _sp = useState(false);
  var showPw = _sp[0]; var setShowPw = _sp[1];
  var _ri = useState(0);
  var resendIn = _ri[0]; var setResendIn = _ri[1];
  var _ss = useState(null);
  var ssoProvider = _ss[0]; var setSsoProvider = _ss[1];
  var _sn = useState("");
  var ssoName = _sn[0]; var setSsoName = _sn[1];
  var _pl = useState(null);
  var pendingLogin = _pl[0]; var setPendingLogin = _pl[1];
  var _sb = useState("");
  var startBal = _sb[0]; var setStartBal = _sb[1];
  var googleBtnRef = useRef(null);

  useEffect(function() {
    if (resendIn <= 0) return;
    var t = setTimeout(function() { setResendIn(function(v) { return v - 1; }); }, 1000);
    return function() { clearTimeout(t); };
  }, [resendIn]);

  function login() {
    setError("");
    var em = email.trim().toLowerCase();
    if (!isEmail(em) || !password) { setError("Enter your email and password."); return; }
    if (!cloudReady()) { setError(CLOUD_SETUP_MSG); return; }
    setBusy(true);
    CLOUD.signIn(em, password).then(function() {
      // The App's auth listener detects the new session and loads the account.
      setBusy(false);
    }).catch(function(err) {
      setBusy(false);
      setError(authMsg(err));
    });
  }

  // Signup is two screens: enter email, then the rest of the details. The first
  // screen only validates the address locally; Firebase tells us at create time
  // if the email is already taken.
  function sendCode() {
    setError(""); setNotice("");
    var em = email.trim().toLowerCase();
    if (!isEmail(em)) { setError("Enter a valid email address."); return; }
    setStep("signup_details");
  }

  function finishSignup() {
    setError("");
    if (!fullName.trim()) { setError("Enter your full name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== password2) { setError("Those passwords don't match."); return; }
    if (!dob) { setError("Enter your date of birth."); return; }
    if (!cloudReady()) { setError(CLOUD_SETUP_MSG); return; }
    var em = email.trim().toLowerCase();
    setBusy(true);
    // Tell the App's auth listener to stand down while we create the user's
    // document ourselves, so it doesn't race in a blank default.
    window.__cbSignup = true;
    CLOUD.signUp(em, password).then(function(cred) {
      var uid = cred.user.uid;
      var initTx = [];
      var sb = parseFloat(startBal);
      if (sb > 0) {
        initTx = [{ type: "income", amount: sb, label: "Starting balance", catId: "c8", category: "Salary", date: new Date().toISOString().slice(0, 10), id: Date.now(), repeat: "none", pending: false }];
      }
      var blob = { tx: initTx, budgets: [], goals: [], notes: [], folders: freshFolders(), categories: freshCategories(), displayName: fullName.trim(), email: em, dob: dob };
      return CLOUD.saveUser(uid, blob).then(function() {
        window.__cbSignup = false;
        setBusy(false);
        props.onLogin(fullName.trim(), blob, uid);
      });
    }).catch(function(err) {
      window.__cbSignup = false;
      setBusy(false);
      // This email already has an account. Block the signup (creating one would
      // wipe their saved data) and send them to Sign In with the email kept, so
      // they pick up their existing account instead of making a duplicate.
      if (err && err.code === "auth/email-already-in-use") {
        setPW(""); setPW2("");
        setStep("login");
        setError("You already have an account with this email. Sign in below.");
        return;
      }
      setError(authMsg(err));
    });
  }

  // Google sign-in via Firebase popup. First-time Google users get a default
  // document created by the App's auth listener.
  function googleSignIn() {
    setError("");
    if (!cloudReady()) { setError(CLOUD_SETUP_MSG); return; }
    setBusy(true);
    CLOUD.signInGoogle().then(function() {
      setBusy(false);
    }).catch(function(err) {
      setBusy(false);
      if (err && err.code === "auth/popup-closed-by-user") return;
      setError(authMsg(err));
    });
  }

  function goTo(s) {
    setStep(s); setError(""); setNotice(""); setSsoProvider(null);
  }

  var titles = {
    login:          { t: "Welcome back",   s: "Sign in to your account" },
    login_verify:   { t: "Check your email", s: "We sent a 6-digit code to " + email },
    signup_email:   { t: "Get started",    s: "Enter your email to begin" },
    signup_verify:  { t: "Check your email", s: "We sent a 6-digit code to " + email },
    signup_details: { t: "Almost there",   s: "A few details to finish your account" },
  };
  var head = titles[step] || titles.login;

  function fieldWrap(iconId, child, mb) {
    return (
      <div style={{ position: "relative", marginBottom: mb }}>
        <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
          <SVGIcon id={iconId} size={17} color={T.ink3} />
        </div>
        {child}
      </div>
    );
  }
  var fieldStyle = { width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 15px 15px 46px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };

  var ssoBlock = (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0 16px" }}>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.12)" }} />
        <span style={{ fontSize: 12, color: T.ink3, fontWeight: 500 }}>or continue with</span>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(0,0,0,0.12)" }} />
      </div>
      <button onClick={googleSignIn} disabled={busy}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", border: "1.5px solid rgba(0,0,0,0.12)", borderRadius: 16, padding: "14px 0", fontSize: 15, fontFamily: UI, fontWeight: 600, color: T.ink, cursor: busy ? "default" : "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        Continue with Google
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", display: "flex", flexDirection: "column", fontFamily: UI, position: "relative", overflow: "hidden" }}>

      <div style={{ position: "absolute", top: -80, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,103,58,0.15) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 60, left: -80, width: 240, height: 240, borderRadius: "50%", background: "radial-gradient(circle,rgba(196,154,60,0.12) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px 24px" }}>

        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <RichyLogo size={80} style={{ display: "block", margin: "0 auto 18px", borderRadius: 22, boxShadow: "0 12px 32px rgba(0,0,0,0.22), 0 4px 12px rgba(0,0,0,0.14)" }} />
          <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            {head.t}
          </div>
          <div style={{ fontSize: 15, color: T.ink2, marginTop: 6, wordBreak: "break-word" }}>
            {head.s}
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          {step === "login" && (
            <div>
              {fieldWrap("mail",
                <input value={email} onChange={function(e) { setEmail(e.target.value); }}
                  placeholder="Email" type="email" autoComplete="email"
                  onKeyDown={function(e) { if (e.key === "Enter") login(); }}
                  style={fieldStyle} />, 12)}
              <div style={{ position: "relative", marginBottom: 0 }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
                  <SVGIcon id="lock" size={17} color={T.ink3} />
                </div>
                <input value={password} onChange={function(e) { setPW(e.target.value); }}
                  type={showPw ? "text" : "password"} placeholder="Password" autoComplete="current-password"
                  onKeyDown={function(e) { if (e.key === "Enter") login(); }}
                  style={{ width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 46px 15px 46px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} />
                <button onClick={function() { setShowPw(function(v) { return !v; }); }}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <SVGIcon id={showPw ? "eyeoff" : "eye"} size={17} color={T.ink3} />
                </button>
              </div>
            </div>
          )}

          {step === "signup_email" && (
            <div>
              {fieldWrap("mail",
                <input value={email} onChange={function(e) { setEmail(e.target.value); }}
                  placeholder="Email" type="email" autoComplete="email" autoFocus
                  onKeyDown={function(e) { if (e.key === "Enter") sendCode(); }}
                  style={fieldStyle} />, 0)}
              <div style={{ fontSize: 12.5, color: T.ink3, padding: "10px 4px 0", lineHeight: 1.5 }}>
                Next you'll set a password and a few details.
              </div>
            </div>
          )}

          {step === "signup_details" && (
            <div>
              {fieldWrap("user",
                <input value={fullName} onChange={function(e) { setFullName(e.target.value); }}
                  placeholder="Full name" autoComplete="name" autoFocus
                  style={fieldStyle} />, 12)}
              <div style={{ position: "relative", marginBottom: 12 }}>
                <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)" }}>
                  <SVGIcon id="lock" size={17} color={T.ink3} />
                </div>
                <input value={password} onChange={function(e) { setPW(e.target.value); }}
                  type={showPw ? "text" : "password"} placeholder="Set a password" autoComplete="new-password"
                  style={{ width: "100%", background: "rgba(255,255,255,0.85)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 46px 15px 46px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }} />
                <button onClick={function() { setShowPw(function(v) { return !v; }); }}
                  style={{ position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <SVGIcon id={showPw ? "eyeoff" : "eye"} size={17} color={T.ink3} />
                </button>
              </div>
              {fieldWrap("lock",
                <input value={password2} onChange={function(e) { setPW2(e.target.value); }}
                  type={showPw ? "text" : "password"} placeholder="Repeat password" autoComplete="new-password"
                  style={fieldStyle} />, 12)}
              <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 4px 7px" }}>Date of birth</div>
              {fieldWrap("calendar",
                <input value={dob} onChange={function(e) { setDob(e.target.value); }}
                  type="date"
                  onKeyDown={function(e) { if (e.key === "Enter") finishSignup(); }}
                  style={fieldStyle} />, 12)}
              {fieldWrap("coins",
                <input value={startBal} onChange={function(e) { setStartBal(e.target.value); }}
                  type="number" placeholder="Starting balance (optional)"
                  onKeyDown={function(e) { if (e.key === "Enter") finishSignup(); }}
                  style={fieldStyle} />, 0)}
            </div>
          )}

          {notice && !error && (
            <div style={{ fontSize: 13, color: T.green, padding: "10px 4px 0", display: "flex", alignItems: "center", gap: 6 }}>
              <SVGIcon id="check" size={14} color={T.green} />
              {notice}
            </div>
          )}

          {error && (
            <div style={{ fontSize: 13, color: T.red, padding: "10px 4px 4px", lineHeight: 1.45 }}>
              {error}
            </div>
          )}

          {!ssoProvider && (
            <button
              onClick={step === "login" ? login : step === "signup_email" ? sendCode : finishSignup}
              disabled={busy}
              style={{ width: "100%", background: busy ? "rgba(0,0,0,0.08)" : "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: busy ? T.ink3 : "#fff", border: "none", borderRadius: 16, padding: "17px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: busy ? "default" : "pointer", marginTop: 16, boxShadow: busy ? "none" : "0 6px 20px " + T.orangeGlow + ", 0 2px 6px rgba(0,0,0,0.1)", letterSpacing: "-0.01em" }}>
              {busy ? "Please wait..."
                : step === "login" ? "Sign In"
                : step === "signup_email" ? "Continue"
                : "Create Account"}
            </button>
          )}

          {(step === "login" || step === "signup_email") && ssoBlock}

          <div style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: T.ink2 }}>
            {step === "login" ? "New here? " : "Have an account? "}
            <button onClick={function() { goTo(step === "login" ? "signup_email" : "login"); }}
              style={{ background: "none", border: "none", color: T.orange, fontWeight: 700, fontSize: 14, fontFamily: UI, cursor: "pointer" }}>
              {step === "login" ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 0 32px", fontSize: 12, color: T.ink3 }}>Synced securely to your account</div>
    </div>
  );
}

function OnboardingScreen(props) {
  var _s = useState(1); var step = _s[0]; var setStep = _s[1];
  var _ls = useState(""); var lifeStage = _ls[0]; var setLifeStage = _ls[1];
  var _inc = useState(""); var income = _inc[0]; var setIncome = _inc[1];
  var _ess = useState(""); var essentials = _ess[0]; var setEssentials = _ess[1];
  var _sav = useState(""); var savings = _sav[0]; var setSavings = _sav[1];
  var _dbt = useState(""); var debt = _dbt[0]; var setDebt = _dbt[1];
  var _gn = useState(""); var goalName = _gn[0]; var setGoalName = _gn[1];
  var _ga = useState(""); var goalAmt = _ga[0]; var setGoalAmt = _ga[1];
  var _tl = useState(""); var timeline = _tl[0]; var setTimeline = _tl[1];
  var _ld = useState(false); var loading = _ld[0]; var setLoading = _ld[1];
  var _er = useState(""); var err = _er[0]; var setErr = _er[1];
  var _gp = useState(""); var genPlan = _gp[0]; var setGenPlan = _gp[1];
  var _god = useState(null); var genOData = _god[0]; var setGenOData = _god[1];

  var age = computeAge(props.dob);

  function buildPlan() {
    setLoading(true);
    setErr("");
    var ageStr = age !== null ? String(age) : "not provided";
    var langName = LANGUAGE_NAMES[props.lang] || "English";
    var langInstruction = langName !== "English" ? " Respond entirely in " + langName + "." : "";
    var system = "You are Richard, a personal finance advisor inside the Richy app. A new user has just answered their onboarding questions. Generate a concise, direct, personalized financial plan for them. Base it on proven frameworks: the 50/30/20 rule, Pay Yourself First, emergency fund before investing, debt avalanche, compound growth. For teenagers: focus on building saving habits, tracking spending, and earning more - no investment jargon. Keep the plan under 250 words. No bullet lists - write in short paragraphs like a knowledgeable friend talking to them directly. No emojis. No markdown headers." + langInstruction;
    var userMsg = "Name: " + props.username + ". Age: " + ageStr + ". Life stage: " + lifeStage + ". Monthly income: $" + (income || "0") + ". Monthly essentials (rent, food, bills): $" + (essentials || "0") + ". Current savings: $" + (savings || "0") + ". Total debt: $" + (debt || "0") + ". Top goal: " + (goalName || "financial freedom") + ", target $" + (goalAmt || "unknown") + ", timeline: " + (timeline || "unspecified") + ". Write my personalized financial plan.";
    callClaude(
      [{ role: "user", content: userMsg }],
      system,
      400,
      function(planErr, text) {
        setLoading(false);
        var plan = (planErr || !text)
          ? ("Start here, " + props.username + ". Track every dollar you spend this month - awareness is step one. Set aside 10% of whatever you earn before you touch anything else. Build one month of essential expenses as a buffer. Then pour your focus into your goal: " + (goalName || "financial freedom") + ". Small consistent actions, repeated every month, compound into real wealth.")
          : text;
        var oData = { lifeStage: lifeStage, income: income, essentials: essentials, savings: savings, debt: debt, goalName: goalName, goalAmt: goalAmt, timeline: timeline, age: ageStr };
        setGenPlan(plan);
        setGenOData(oData);
        setStep(5);
      }
    );
  }

  var STAGES = [
    { label: "Teenager",   icon: "star" },
    { label: "Student",    icon: "book" },
    { label: "Working",    icon: "briefcase" },
    { label: "Parent",     icon: "home" },
  ];
  var TIMELINES = ["6 months", "1 year", "2 years", "5+ years"];

  var fieldStyle = { width: "100%", background: "rgba(255,255,255,0.88)", border: "1.5px solid rgba(0,0,0,0.09)", borderRadius: 16, padding: "15px 16px", fontSize: 16, fontFamily: UI, color: T.ink, outline: "none", boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", marginBottom: 12, display: "block" };
  var labelStyle = { fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "block" };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: UI }}>
        <div style={{ textAlign: "center", padding: "0 32px" }}>
          <div style={{ width: 64, height: 64, borderRadius: 22, background: "linear-gradient(145deg," + T.orangeHi + "," + T.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px", boxShadow: "0 12px 32px " + T.orangeGlow }}>
            <SVGIcon id="spark" size={30} color="#fff" />
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.3 }}>
            Richard is building your plan...
          </div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 10 }}>This takes just a moment.</div>
        </div>
      </div>
    );
  }

  function suggestBudgets() {
    var inc = parseFloat(income) || 0;
    var ess = parseFloat(essentials) || 0;
    var disc = Math.max(0, inc - ess);
    var result = [];
    if (ess > 0) {
      result.push({ catId: "c1", category: "Housing",   limit: Math.round(ess * 0.50) });
      result.push({ catId: "c2", category: "Food",      limit: Math.round(ess * 0.25) });
      result.push({ catId: "c3", category: "Transport", limit: Math.round(ess * 0.15) });
      result.push({ catId: "c4", category: "Health",    limit: Math.round(ess * 0.10) });
    }
    if (disc > 0) {
      result.push({ catId: "c5", category: "Entertainment", limit: Math.round(disc * 0.35) });
      result.push({ catId: "c6", category: "Shopping",      limit: Math.round(disc * 0.35) });
      result.push({ catId: "c7", category: "Travel",        limit: Math.round(disc * 0.20) });
      result.push({ catId: "c11",category: "Other",         limit: Math.round(disc * 0.10) });
    }
    return result.filter(function(b) { return b.limit > 0; });
  }

  if (step === 5) {
    var proposed = suggestBudgets();
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", fontFamily: UI, overflowY: "auto" }}>
        <div style={{ padding: "56px 24px 52px" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
            <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(145deg," + T.orangeHi + "," + T.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 8px 24px " + T.orangeGlow }}>
              <SVGIcon id="spark" size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>Your plan is ready.</div>
              <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>Richard built this just for you.</div>
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 18, padding: "20px 20px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Your Plan by Richard</div>
            <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.7 }}>{genPlan}</div>
          </div>

          {proposed.length > 0 && (
            <div style={{ background: "#fff", borderRadius: 18, padding: "20px 20px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Set up your budgets automatically?</div>
              <div style={{ fontSize: 13, color: T.ink3, marginBottom: 18, lineHeight: 1.55 }}>Based on your numbers, Richard suggests these monthly limits:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {proposed.map(function(b) {
                  return (
                    <div key={b.catId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 14, color: T.ink2 }}>{b.category}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>${b.limit}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={function() { props.onComplete(genPlan, genOData, proposed); }}
                style={{ width: "100%", background: "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: "#fff", border: "none", borderRadius: 14, padding: "15px 0", fontSize: 16, fontFamily: UI, fontWeight: 700, cursor: "pointer", marginBottom: 10, boxShadow: "0 4px 16px " + T.orangeGlow }}>
                Yes, set them up
              </button>
              <button onClick={function() { props.onComplete(genPlan, genOData, null); }}
                style={{ width: "100%", background: "none", border: "none", fontSize: 14, color: T.ink3, cursor: "pointer", fontFamily: UI, padding: "8px 0" }}>
                I'll set them up myself
              </button>
            </div>
          )}

          {proposed.length === 0 && (
            <button onClick={function() { props.onComplete(genPlan, genOData, null); }}
              style={{ width: "100%", background: "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: "#fff", border: "none", borderRadius: 16, padding: "17px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px " + T.orangeGlow }}>
              Get Started
            </button>
          )}

        </div>
      </div>
    );
  }

  var questions = [
    { q: "How would you describe yourself?",      s: "This helps Richard tailor your plan to your life." },
    { q: "What is your monthly money situation?",  s: "Approximate numbers are completely fine." },
    { q: "Where do you stand right now?",          s: "Honest numbers lead to a better plan." },
    { q: "What is your most important goal?",      s: "Something specific you want to reach." },
  ];
  var current = questions[step - 1];

  function nextStep() {
    if (step === 1 && !lifeStage) { setErr("Pick the option that fits you best."); return; }
    setErr("");
    if (step < 4) { setStep(step + 1); return; }
    buildPlan();
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", fontFamily: UI, display: "flex", flexDirection: "column" }}>

      <div style={{ padding: "64px 24px 0", flex: 1 }}>

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 44 }}>
          {[1, 2, 3, 4].map(function(n) {
            return (
              <div key={n} style={{ width: 8, height: 8, borderRadius: "50%", background: n <= step ? T.orange : "rgba(200,103,58,0.22)", transition: "background 0.25s" }} />
            );
          })}
        </div>

        <div style={{ fontSize: 25, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: 8 }}>
          {current.q}
        </div>
        <div style={{ fontSize: 14, color: T.ink3, marginBottom: 28, lineHeight: 1.55 }}>
          {current.s}
        </div>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {STAGES.map(function(st) {
              var sel = lifeStage === st.label;
              return (
                <button key={st.label} onClick={function() { setLifeStage(st.label); setErr(""); }}
                  style={{ background: sel ? "rgba(200,103,58,0.07)" : "#fff", border: "1.5px solid " + (sel ? T.orange : "rgba(0,0,0,0.08)"), borderRadius: 15, padding: "16px 20px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)", fontFamily: UI }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: sel ? T.orangeDim : "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SVGIcon id={st.icon} size={18} color={sel ? T.orange : T.ink3} />
                  </div>
                  <span style={{ fontSize: 17, fontWeight: sel ? 700 : 500, color: sel ? T.ink : T.ink2 }}>{st.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div>
            <span style={labelStyle}>Monthly Income</span>
            <input value={income} onChange={function(e) { setIncome(e.target.value); }} type="number" placeholder="e.g. 3000" style={fieldStyle} />
            <span style={Object.assign({}, labelStyle, { marginTop: 4 })}>Monthly Essentials</span>
            <div style={{ fontSize: 12, color: T.ink3, marginBottom: 8 }}>Rent, food, utilities, transport</div>
            <input value={essentials} onChange={function(e) { setEssentials(e.target.value); }} type="number" placeholder="e.g. 1800" style={fieldStyle} />
          </div>
        )}

        {step === 3 && (
          <div>
            <span style={labelStyle}>Current Savings</span>
            <input value={savings} onChange={function(e) { setSavings(e.target.value); }} type="number" placeholder="e.g. 500" style={fieldStyle} />
            <span style={Object.assign({}, labelStyle, { marginTop: 4 })}>Total Debt</span>
            <div style={{ fontSize: 12, color: T.ink3, marginBottom: 8 }}>Credit cards, loans - enter 0 if none</div>
            <input value={debt} onChange={function(e) { setDebt(e.target.value); }} type="number" placeholder="e.g. 0" style={fieldStyle} />
          </div>
        )}

        {step === 4 && (
          <div>
            <span style={labelStyle}>Goal Name</span>
            <input value={goalName} onChange={function(e) { setGoalName(e.target.value); }} type="text" placeholder="e.g. Emergency fund, New laptop" style={fieldStyle} />
            <span style={Object.assign({}, labelStyle, { marginTop: 4 })}>Target Amount</span>
            <input value={goalAmt} onChange={function(e) { setGoalAmt(e.target.value); }} type="number" placeholder="e.g. 5000" style={fieldStyle} />
            <span style={Object.assign({}, labelStyle, { marginTop: 4 })}>Timeline</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
              {TIMELINES.map(function(t) {
                var sel = timeline === t;
                return (
                  <button key={t} onClick={function() { setTimeline(t); }}
                    style={{ background: sel ? T.orange : "#fff", border: "1.5px solid " + (sel ? T.orange : "rgba(0,0,0,0.09)"), borderRadius: 30, padding: "9px 18px", fontSize: 14, fontWeight: sel ? 700 : 500, color: sel ? "#fff" : T.ink2, cursor: "pointer", fontFamily: UI }}>
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {err && (
          <div style={{ fontSize: 13, color: T.red, marginTop: 14, lineHeight: 1.45 }}>{err}</div>
        )}

      </div>

      <div style={{ padding: "20px 24px 52px" }}>
        {step > 1 && (
          <button onClick={function() { setStep(step - 1); setErr(""); }}
            style={{ background: "none", border: "none", fontSize: 14, color: T.ink3, cursor: "pointer", fontFamily: UI, marginBottom: 10, padding: 0 }}>
            Back
          </button>
        )}
        <button onClick={nextStep}
          style={{ width: "100%", background: "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", color: "#fff", border: "none", borderRadius: 16, padding: "17px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 20px " + T.orangeGlow + ", 0 2px 6px rgba(0,0,0,0.1)", letterSpacing: "-0.01em" }}>
          {step < 4 ? "Next" : "Build My Plan"}
        </button>
        {step > 1 && step < 4 && (
          <button onClick={function() { setErr(""); setStep(step + 1); }}
            style={{ background: "none", border: "none", fontSize: 13, color: T.ink3, cursor: "pointer", fontFamily: UI, marginTop: 14, padding: 0, display: "block", width: "100%", textAlign: "center" }}>
            Skip this step
          </button>
        )}
      </div>

    </div>
  );
}

function Overview(props) {
  var tx       = props.tx;
  var goals    = props.goals;
  var budgets  = props.budgets || [];
  var cats     = props.categories || [];
  var username = props.username || "";
  var name     = username.charAt(0).toUpperCase() + username.slice(1);

  var h    = new Date().getHours();
  var mins = new Date().getMinutes();
  var day  = new Date().getDay();
  var period = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  var tod = tr(period);

  var pairs = [
    { g: tod + ", " + name + ".",                      s: "Here's where you stand." },
    { g: "How are you saving today, " + name + "?",    s: "Your numbers for today." },
    { g: "Getting productive, " + name + "?",          s: "Let's see how you're doing." },
    { g: "Hey, " + name + ".",                         s: "Quick look at your finances." },
    { g: "Coffee and wealth, " + name + ".",           s: "Here's your overview." },
    { g: "Hi " + name + ".",                           s: "Everything in one place." },
    { g: "Are we rich yet, " + name + "?",             s: "Let's check the numbers." },
    { g: "Another day, another dollar, " + name + ".", s: "Your financial snapshot." },
    { g: "What are we building today, " + name + "?",  s: "Here's the latest." },
    { g: "Wealth is a habit, " + name + ".",           s: "A clear view of your money." },
    { g: "Still at it, " + name + "?",                 s: "Today at a glance." },
    { g: "The grind continues, " + name + ".",         s: "Here's where things stand." },
    { g: "Money doesn't sleep, " + name + ".",         s: "Neither do your numbers." },
    { g: tod + ", " + name + ".",                      s: "Your financial snapshot." },
    { g: "Sharp eye on the numbers, " + name + ".",    s: "Your overview." },
    { g: "Eyes on the prize, " + name + ".",           s: "Here's the full picture." },
  ];

  if (h < 14) {
    if (day === 5) pairs.push({ g: "Happy Friday, " + name + ".",   s: "End the week strong." });
    if (day === 6) pairs.push({ g: "Happy Saturday, " + name + ".", s: "Your weekend overview." });
    if (day === 0) pairs.push({ g: "Happy Sunday, " + name + ".",   s: "Rest, review, repeat." });
    if (day === 1) pairs.push({ g: "New week, " + name + ".",       s: "Fresh start, clean slate." });
  }
  if (_lang.code !== "en") { pairs = [{ g: tod + ", " + name + ".", s: "" }]; }

  var idx      = mins % pairs.length;
  var greeting = pairs[idx].g;
  var subtitle = pairs[idx].s;

  var income  = tx.filter(function(t) { return t.type === "income"; }).reduce(function(s,t) { return s+t.amount; }, 0);
  var expense = tx.filter(function(t) { return t.type === "expense"; }).reduce(function(s,t) { return s+t.amount; }, 0);
  var balance = income - expense;
  var savRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  function spentInCat(c) {
    return tx.filter(function(t) { return t.type === "expense" && (t.catId === c.id || t.category === c.name); }).reduce(function(s,t){return s+t.amount;}, 0);
  }
  var byCat = cats.map(function(c) {
    return { id: c.id, name: c.name, color: c.color, icon: c.icon, val: spentInCat(c) };
  }).sort(function(a,b){ return b.val - a.val; });
  var topCat = byCat[0];
  var pie = byCat.filter(function(c) { return c.val > 0; }).map(function(c) { return { name: c.name, color: c.color, value: c.val }; });
  var recent = tx.slice().sort(function(a,b){ return b.date.localeCompare(a.date); }).slice(0,4);

  var budgetRows = budgets.map(function(b) {
    var c = catById(cats, b.catId) || catByName(cats, b.category) || { id: b.catId, name: b.category || "Budget", color: T.orange, icon: "box" };
    var s = spentInCat(c);
    var pct = b.limit > 0 ? Math.round((s / b.limit) * 100) : 0;
    return { cat: c, spent: s, limit: b.limit, pct: pct, over: s > b.limit && b.limit > 0 };
  }).sort(function(a,b){ return b.pct - a.pct; });

  return (
    <div>

      <div style={{ padding: "6px 2px 22px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, letterSpacing: "-0.03em", lineHeight: 1.18 }}>
            {greeting}
          </div>
          <div style={{ fontSize: 14, color: T.ink3, marginTop: 5, fontStyle: "italic" }}>
            {subtitle}
          </div>
        </div>
        <button onClick={props.onCategories} style={{ flexShrink: 0, marginTop: 4, marginLeft: 18, width: 42, height: 42, borderRadius: 14, background: T.orange, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(200,103,58,0.32)" }}>
          <SVGIcon id="categories" size={20} color="#fff" />
        </button>
      </div>

      <div style={{ borderRadius: 22, overflow: "hidden", marginBottom: 16, background: "linear-gradient(145deg," + T.dark + " 0%," + T.darkCard + " 50%," + T.darkCard2 + " 100%)", boxShadow: "0 12px 40px rgba(20,18,16,0.28), 0 2px 8px rgba(0,0,0,0.14)", position: "relative" }}>
        <div style={{ position: "absolute", top: -40, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,103,58,0.22) 0%,transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle,rgba(200,152,58,0.14) 0%,transparent 70%)", pointerEvents: "none" }} />
        <div style={{ padding: "26px 24px 22px", position: "relative" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6 }}>
            {tr("netBalance")}
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>
            {dollars(balance)}
          </div>
          {income > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: savRate >= 20 ? "rgba(39,168,95,0.2)" : "rgba(200,103,58,0.2)", borderRadius: 30, padding: "3px 10px", marginBottom: 20 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: savRate >= 20 ? T.green : T.orange }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: savRate >= 20 ? "#4ADE80" : T.orangeHi }}>
                {savRate}{"% "}{tr("savedThisPeriod")}
              </span>
            </div>
          )}
          <div style={{ height: "0.5px", background: "rgba(255,255,255,0.08)", marginBottom: 18 }} />
          <div style={{ display: "flex", gap: 0 }}>
            <div style={{ flex: 1, paddingRight: 18, borderRight: "0.5px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{tr("income")}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#4ADE80", letterSpacing: "-0.02em" }}>{dollars(income)}</div>
            </div>
            <div style={{ flex: 1, paddingLeft: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{tr("spent")}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>{dollars(expense)}</div>
            </div>
          </div>
        </div>
        {topCat && topCat.val > 0 && (
          <div style={{ padding: "12px 24px 16px", borderTop: "0.5px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: topCat.color }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{tr("topSpend")}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{topCat.name} {" -  "}{dollars(topCat.val)}</span>
          </div>
        )}
      </div>

      {props.plan && (
        <div style={{ background: "rgba(200,103,58,0.04)", borderRadius: 18, padding: "20px 22px", marginBottom: 16, boxShadow: "0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)", borderLeft: "3px solid " + T.orange }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: UI, marginBottom: 10 }}>
            {tr("yourPlanByRichard")}
          </div>
          <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.65, fontFamily: UI }}>
            {props.plan}
          </div>
        </div>
      )}

      {tx.length === 0 && (
        <Card style={{ padding: "36px 24px", textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="activity" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 5 }}>{tr("noTransactions")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("overviewEmptySub")}</div>
        </Card>
      )}

      {income > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, background: savRate >= 20 ? T.greenDim : savRate > 0 ? T.orangeDim : "rgba(224,48,48,0.07)", borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{tr("savingsRate")}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: savRate >= 20 ? T.green : savRate > 0 ? T.orange : T.red, letterSpacing: "-0.02em" }}>{savRate}%</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>{savRate >= 20 ? tr("excellent") : savRate >= 10 ? tr("onTrack") : savRate > 0 ? tr("buildItUp") : tr("overspending")}</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{tr("transactions")}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tx.length}</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>{tr("thisPeriod")}</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "16px 16px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{tr("goals")}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{goals.length}</div>
            <div style={{ fontSize: 11, color: T.ink3, marginTop: 3 }}>{goals.length === 1 ? tr("activeGoal") : tr("activeGoals")}</div>
          </div>
        </div>
      )}

      {pie.length > 0 && (
        <div>
          <div style={{ padding: "0 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("whereItWent")}</span>
            </div>
            <span style={{ fontSize: 12, color: T.ink3 }}>{dollars(expense)} total</span>
          </div>
          <Card style={{ padding: "18px 18px 14px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <ResponsiveContainer width={96} height={96}>
                <PieChart>
                  <Pie data={pie} cx="50%" cy="50%" innerRadius={26} outerRadius={46} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {pie.map(function(c, i) { return <Cell key={i} fill={c.color} />; })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {pie.slice(0,5).map(function(c) {
                  var pct = Math.round((c.value / expense) * 100);
                  return (
                    <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 13, color: T.ink, fontWeight: 500 }}>{c.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.ink2 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {budgetRows.length > 0 && (
        <div>
          <div style={{ padding: "0 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("budgets")}</span>
            </div>
            <span style={{ fontSize: 12, color: T.ink3 }}>{budgetRows.filter(function(b){return b.over;}).length > 0 ? budgetRows.filter(function(b){return b.over;}).length + " " + tr("overLimit") : tr("onTrack")}</span>
          </div>
          <Card style={{ marginBottom: 20, overflow: "hidden" }}>
            {budgetRows.map(function(b, i) {
              return (
                <div key={b.cat.id || i} style={{ padding: "13px 16px", borderBottom: i < budgetRows.length-1 ? "0.5px solid " + T.sep : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
                    <CatBadge icon={b.cat.icon} color={b.cat.color} size={32} soft={true} />
                    <span style={{ flex: 1, fontSize: 14.5, color: T.ink, fontWeight: 600 }}>{b.cat.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: b.over ? T.red : T.ink2 }}>{b.pct}%</span>
                  </div>
                  <ProgressBar value={b.spent} max={b.limit} color={b.over ? T.red : b.cat.color} h={6} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: b.over ? T.red : T.ink3 }}>{dollars(b.spent) + " " + tr("spentLabel")}</span>
                    <span style={{ fontSize: 11, color: T.ink3 }}>{"of " + dollars(b.limit)}</span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {goals.length > 0 && (
        <div>
          <div style={{ padding: "0 2px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("goals")}</span>
            </div>
            <span style={{ fontSize: 12, color: T.ink3 }}>{goals.filter(function(g){return g.saved>=g.target;}).length + "/" + goals.length + " " + tr("complete")}</span>
          </div>
          <Card style={{ marginBottom: 20, overflow: "hidden" }}>
            {goals.map(function(g, i) {
              var pct = Math.min(100, Math.round((g.saved / g.target) * 100));
              var done = g.saved >= g.target;
              return (
                <div key={g.id} style={{ padding: "14px 18px", borderBottom: i < goals.length-1 ? "0.5px solid " + T.sep : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 15, color: T.ink, fontWeight: 600 }}>{g.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {done && <span style={{ fontSize: 10, fontWeight: 700, color: T.green, background: T.greenDim, borderRadius: 20, padding: "2px 8px" }}>DONE</span>}
                      <span style={{ fontSize: 14, fontWeight: 700, color: done ? T.green : T.orange }}>{pct}%</span>
                    </div>
                  </div>
                  <ProgressBar value={g.saved} max={g.target} color={done ? T.green : T.orange} h={5} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(g.saved) + " " + tr("savedLabel")}</span>
                    <span style={{ fontSize: 11, color: T.ink3, fontWeight: 500 }}>{dollars(g.target - g.saved) + " " + tr("toGo")}</span>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <div style={{ padding: "0 2px 10px", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: T.orange, flexShrink: 0 }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("recent")}</span>
          </div>
          <Card style={{ overflow: "hidden", marginBottom: 8 }}>
            {recent.map(function(t, i) {
              var c = resolveCat(cats, t);
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: i < recent.length-1 ? "0.5px solid " + T.sep : "none" }}>
                  <CatBadge icon={t.type === "income" ? "up" : c.icon} color={t.type === "income" ? T.green : c.color} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, color: T.ink, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</div>
                    <div style={{ fontSize: 11, color: T.ink3, marginTop: 1 }}>{t.type === "income" ? tr("income") : c.name} {"  "}{t.date}{t.origCur && t.origCur !== _currency.sym ? "  -  " + fmtCur(t.origCur, t.origAmount) : ""}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: t.type === "income" ? T.green : T.ink, flexShrink: 0 }}>
                    {t.type === "income" ? "+" : "-"}{dollars(t.amount)}
                  </span>
                </div>
              );
            })}
          </Card>
        </div>
      )}

    </div>
  );
}

function dateLabel(date) {
  var today = new Date().toISOString().slice(0, 10);
  var yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (date === today) return tr("today");
  if (date === yest) return tr("yesterday");
  var localeMap = { en: "en-US", he: "he-IL", es: "es-ES", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU", de: "de-DE", pt: "pt-BR" };
  var locale = localeMap[_lang.code] || "en-US";
  var d = new Date(date + "T12:00:00");
  return d.toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" });
}

function Activity(props) {
  var cats = props.categories || [];
  var mainSym = _currency.sym;
  var blankForm = { type: "expense", amount: "", label: "", catId: (cats[0] || {}).id || "", date: new Date().toISOString().slice(0, 10), repeat: "none", pending: false, cur: mainSym, rate: 1, rateLoading: false, rateFallback: false };
  var _f = useState(blankForm);
  var form = _f[0]; var setForm = _f[1];
  var _et = useState(null);
  var editTx = _et[0]; var setEditTx = _et[1];
  var _ef = useState(blankForm);
  var editForm = _ef[0]; var setEditForm = _ef[1];

  function setField(key, val) {
    setForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }
  function setEditField(key, val) {
    setEditForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }

  function pickCur(sym) {
    setForm(function(prev) {
      var next = {}; for (var k in prev) next[k] = prev[k];
      next.cur = sym; next.rateLoading = sym !== mainSym; next.rateFallback = false;
      if (sym === mainSym) next.rate = 1;
      return next;
    });
    if (sym === mainSym) return;
    fetchRate(sym, mainSym, function(rate, fb) {
      setForm(function(prev) {
        if (prev.cur !== sym) return prev;
        var next = {}; for (var k in prev) next[k] = prev[k];
        next.rate = rate; next.rateLoading = false; next.rateFallback = fb;
        return next;
      });
    });
  }
  function pickEditCur(sym) {
    setEditForm(function(prev) {
      var next = {}; for (var k in prev) next[k] = prev[k];
      next.cur = sym; next.rateLoading = sym !== mainSym; next.rateFallback = false;
      if (sym === mainSym) next.rate = 1;
      return next;
    });
    if (sym === mainSym) return;
    fetchRate(sym, mainSym, function(rate, fb) {
      setEditForm(function(prev) {
        if (prev.cur !== sym) return prev;
        var next = {}; for (var k in prev) next[k] = prev[k];
        next.rate = rate; next.rateLoading = false; next.rateFallback = fb;
        return next;
      });
    });
  }

  var pressTimer = useRef(null);
  function startLongPress(t) {
    pressTimer.current = setTimeout(function() {
      setEditTx(t);
      var hasForeign = t.origCur && t.origCur !== mainSym;
      setEditForm({ type: t.type, amount: String(hasForeign ? t.origAmount : t.amount), label: t.label, catId: t.catId || "", date: t.date, repeat: t.repeat || "none", pending: t.pending || false,
        cur: hasForeign ? t.origCur : mainSym, rate: hasForeign ? (t.rate || fxStaticRate(t.origCur, mainSym)) : 1, rateLoading: false, rateFallback: false });
      pressTimer.current = null;
    }, 500);
  }
  function cancelLongPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }

  function add() {
    if (!form.amount || !form.label) return;
    var c = catById(cats, form.catId) || cats[0] || { id: "", name: "Other" };
    var entered = parseFloat(form.amount);
    var foreign = form.cur && form.cur !== mainSym;
    var rate = foreign ? (form.rate || fxStaticRate(form.cur, mainSym)) : 1;
    var mainAmount = round2(entered * rate);
    var tx = { type: form.type, amount: mainAmount, label: form.label, catId: c.id, category: c.name, date: form.date, id: Date.now(), repeat: form.repeat, pending: form.pending };
    if (foreign) { tx.origAmount = entered; tx.origCur = form.cur; tx.rate = rate; }
    props.onSaveTx(props.tx.concat([tx]));
    setForm(blankForm);
    props.setSheetOpen(false);
  }

  function saveEdit() {
    if (!editForm.amount || !editForm.label || !editTx) return;
    var c = catById(cats, editForm.catId) || cats[0] || { id: "", name: "Other" };
    var entered = parseFloat(editForm.amount);
    var foreign = editForm.cur && editForm.cur !== mainSym;
    var rate = foreign ? (editForm.rate || fxStaticRate(editForm.cur, mainSym)) : 1;
    var mainAmount = round2(entered * rate);
    props.onSaveTx(props.tx.map(function(t) {
      if (t.id !== editTx.id) return t;
      var nt = { id: t.id, type: editForm.type, amount: mainAmount, label: editForm.label, catId: c.id, category: c.name, date: editForm.date, repeat: editForm.repeat, pending: editForm.pending };
      if (foreign) { nt.origAmount = entered; nt.origCur = editForm.cur; nt.rate = rate; }
      return nt;
    }));
    setEditTx(null);
  }

  var sorted = props.tx.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  var groups = {};
  sorted.forEach(function(t) {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });
  var dates = Object.keys(groups).sort(function(a, b) { return b.localeCompare(a); });

  var totalIn  = props.tx.filter(function(t){return t.type==="income";}).reduce(function(s,t){return s+t.amount;},0);
  var totalOut = props.tx.filter(function(t){return t.type==="expense";}).reduce(function(s,t){return s+t.amount;},0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={props.onOpenNotes} title={tr("notes")}
          style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 14, background: T.orange, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(200,103,58,0.32)" }}>
          <SVGIcon id="note" size={20} color="#fff" />
        </button>
      </div>
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title={tr("newTransaction")}>
        <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
          {["expense","income"].map(function(opt) {
            var on = form.type === opt;
            return (
              <button key={opt} onClick={function() { setField("type", opt); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: UI,
                  background: on ? (opt === "income" ? T.greenDim : T.orangeDim) : "rgba(0,0,0,0.04)",
                  color: on ? (opt === "income" ? T.green : T.orange) : T.ink3 }}>
                {opt === "income" ? tr("income") : tr("expense")}
              </button>
            );
          })}
        </div>
        <AmountField value={form.amount} onAmount={function(e) { setField("amount", e.target.value); }} cur={form.cur} onCur={pickCur} mainSym={mainSym} rate={form.rate} rateLoading={form.rateLoading} rateFallback={form.rateFallback} />
        <FormRow label={tr("txLabel")} value={form.label} onChange={function(e) { setField("label", e.target.value); }} placeholder={form.type === "income" ? "Salary, freelance, gift..." : "Groceries, rent, coffee..."} />
        <CatPicker label={tr("category")} categories={cats} value={form.catId} onChange={function(id) { setField("catId", id); }} onManage={props.onManageCategories} />
        <FormRow label={tr("date")} value={form.date} onChange={function(e) { setField("date", e.target.value); }} type="date" />
        <div style={{ marginBottom: 7 }}>
          <div style={{ fontSize: 10.5, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>{tr("repeat")}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["none","weekly","monthly"].map(function(opt) {
              var on = form.repeat === opt;
              return (
                <button key={opt} onClick={function() { setField("repeat", opt); }}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: UI,
                    background: on ? T.orangeDim : "rgba(0,0,0,0.04)",
                    color: on ? T.orange : T.ink3 }}>
                  {opt === "none" ? tr("once") : opt === "weekly" ? tr("weekly") : tr("monthly")}
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={function() { setField("pending", !form.pending); }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 8,
            background: form.pending ? T.goldDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: form.pending ? T.gold : T.ink2 }}>{tr("markPending")}</span>
          <div style={{ width: 18, height: 18, borderRadius: 6, border: "2px solid " + (form.pending ? T.gold : T.ink3), background: form.pending ? T.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {form.pending && <SVGIcon id="check" size={10} color="#fff" />}
          </div>
        </button>
        <BigBtn label={tr("addTransaction")} onPress={add} disabled={!form.amount || !form.label} />
      </Overlay>

      <Overlay open={!!editTx} onClose={function() { setEditTx(null); }} title={tr("editTransaction")}>
        <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
          {["expense","income"].map(function(opt) {
            var on = editForm.type === opt;
            return (
              <button key={opt} onClick={function() { setEditField("type", opt); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: UI,
                  background: on ? (opt === "income" ? T.greenDim : T.orangeDim) : "rgba(0,0,0,0.04)",
                  color: on ? (opt === "income" ? T.green : T.orange) : T.ink3 }}>
                {opt === "income" ? tr("income") : tr("expense")}
              </button>
            );
          })}
        </div>
        <AmountField value={editForm.amount} onAmount={function(e) { setEditField("amount", e.target.value); }} cur={editForm.cur} onCur={pickEditCur} mainSym={mainSym} rate={editForm.rate} rateLoading={editForm.rateLoading} rateFallback={editForm.rateFallback} />
        <FormRow label={tr("txLabel")} value={editForm.label} onChange={function(e) { setEditField("label", e.target.value); }} placeholder={editForm.type === "income" ? "Salary, freelance, gift..." : "Groceries, rent, coffee..."} />
        <CatPicker label={tr("category")} categories={cats} value={editForm.catId} onChange={function(id) { setEditField("catId", id); }} onManage={props.onManageCategories} />
        <FormRow label={tr("date")} value={editForm.date} onChange={function(e) { setEditField("date", e.target.value); }} type="date" />
        <div style={{ marginBottom: 7 }}>
          <div style={{ fontSize: 10.5, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 5 }}>{tr("repeat")}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["none","weekly","monthly"].map(function(opt) {
              var on = editForm.repeat === opt;
              return (
                <button key={opt} onClick={function() { setEditField("repeat", opt); }}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: UI,
                    background: on ? T.orangeDim : "rgba(0,0,0,0.04)",
                    color: on ? T.orange : T.ink3 }}>
                  {opt === "none" ? tr("once") : opt === "weekly" ? tr("weekly") : tr("monthly")}
                </button>
              );
            })}
          </div>
        </div>
        <button onClick={function() { setEditField("pending", !editForm.pending); }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 8,
            background: editForm.pending ? T.goldDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: editForm.pending ? T.gold : T.ink2 }}>{tr("markPending")}</span>
          <div style={{ width: 18, height: 18, borderRadius: 6, border: "2px solid " + (editForm.pending ? T.gold : T.ink3), background: editForm.pending ? T.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {editForm.pending && <SVGIcon id="check" size={10} color="#fff" />}
          </div>
        </button>
        <BigBtn label={tr("saveChanges")} onPress={saveEdit} disabled={!editForm.amount || !editForm.label} />
        <button onClick={function() { props.onSaveTx(props.tx.filter(function(x) { return x.id !== editTx.id; })); setEditTx(null); }}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>
          {tr("deleteTx")}
        </button>
      </Overlay>

      {props.tx.length === 0 && (
        <Card style={{ padding: "46px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="activity" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{tr("noTransactions")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("noTransactionsSub")}</div>
        </Card>
      )}

      {props.tx.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{tr("moneyIn")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.green, letterSpacing: "-0.02em" }}>{dollars(totalIn)}</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{tr("moneyOut")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(totalOut)}</div>
          </div>
        </div>
      )}

      {dates.map(function(date) {
        var dayItems = groups[date];
        var dayNet = dayItems.reduce(function(s,t){ return t.type === "income" ? s + t.amount : s - t.amount; }, 0);
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 4px 8px" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dateLabel(date)}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: dayNet >= 0 ? T.green : T.ink2 }}>{dayNet >= 0 ? "+" : "-"}{dollars(dayNet)}</span>
            </div>
            <Card style={{ overflow: "hidden" }}>
              {dayItems.map(function(t, i) {
                var c = resolveCat(cats, t);
                return (
                  <div key={t.id}
                    onMouseDown={function() { startLongPress(t); }}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={function() { startLongPress(t); }}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onContextMenu={function(e) { e.preventDefault(); }}
                    style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", borderBottom: i < dayItems.length - 1 ? "0.5px solid " + T.sep : "none", opacity: t.pending ? 0.62 : 1, cursor: "pointer", userSelect: "none", WebkitUserSelect: "none" }}>
                    <CatBadge icon={t.type === "income" ? "up" : c.icon} color={t.type === "income" ? T.green : c.color} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: T.ink3, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.type === "income" ? T.green : c.color, display: "inline-block" }} />
                          {t.type === "income" ? tr("income") : c.name}
                        </span>
                        {t.origCur && t.origCur !== _currency.sym && <span style={{ fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldDim, borderRadius: 5, padding: "1px 6px", letterSpacing: "0.02em" }}>{fmtCur(t.origCur, t.origAmount)}</span>}
                        {t.pending && <span style={{ fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldDim, borderRadius: 5, padding: "1px 6px", letterSpacing: "0.04em" }}>PENDING</span>}
                        {t.repeat && t.repeat !== "none" && <span style={{ fontSize: 10, fontWeight: 600, color: T.ink2, background: T.orangeDim, borderRadius: 5, padding: "1px 6px" }}>{t.repeat === "weekly" ? tr("weekly") : tr("monthly")}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: t.type === "income" ? T.green : T.red, letterSpacing: "-0.02em" }}>
                      {t.type === "income" ? "+" : "-"}{dollars(t.amount)}
                    </span>
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}

// Convert an absolute epoch-ms instant to the value a datetime-local input wants
// ("YYYY-MM-DDTHH:MM" in local time).
function toLocalInput(ms) {
  var d = new Date(ms);
  function p(x) { return (x < 10 ? "0" : "") + x; }
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

// Ask for notification permission lazily (only when a reminder is first set).
// Calls cb(granted). Never throws on browsers without the API.
function ensureNotifyPermission(cb) {
  if (typeof window === "undefined" || !("Notification" in window)) { cb(false); return; }
  if (Notification.permission === "granted") { cb(true); return; }
  if (Notification.permission === "denied") { cb(false); return; }
  try {
    Notification.requestPermission().then(function(p) { cb(p === "granted"); });
  } catch (e) { cb(false); }
}

// Fire a reminder notification for a note. Prefers the service worker (so it
// survives the page and supports mobile), falling back to a plain Notification.
function fireReminder(n) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  var body = (n.dir === "owed" ? "They owe you " : "You owe ") + dollars(n.amount) + " - " + n.label;
  function plain() { try { new Notification("Richy", { body: body }); } catch (e) {} }
  if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistration) {
    navigator.serviceWorker.getRegistration().then(function(reg) {
      if (reg && reg.showNotification) { reg.showNotification("Richy", { body: body, tag: "note-" + n.id }); }
      else { plain(); }
    }).catch(plain);
  } else { plain(); }
}

// Notes / "who owes whom". A note looks like an Activity row but the amount is
// neutral (it is not real money yet) and carries a direction tag. Settling a note
// optionally converts it into a real transaction and removes it from the list.
function Notes(props) {
  var cats = props.categories || [];
  var mainSym = _currency.sym;
  var blankForm = { dir: "owed", amount: "", label: "", catId: (cats[0] || {}).id || "", date: new Date().toISOString().slice(0, 10), cur: mainSym, rate: 1, rateLoading: false, rateFallback: false };
  var _f = useState(blankForm);
  var form = _f[0]; var setForm = _f[1];
  var _en = useState(null);
  var editNote = _en[0]; var setEditNote = _en[1];
  var _ef = useState(blankForm);
  var editForm = _ef[0]; var setEditForm = _ef[1];
  var _sn = useState(null);
  var settleNote = _sn[0]; var setSettleNote = _sn[1];
  var _ab = useState(true);
  var addToBalance = _ab[0]; var setAddToBalance = _ab[1];
  var _an = useState(null);
  var actNote = _an[0]; var setActNote = _an[1];
  var _rw = useState("");
  var remWhen = _rw[0]; var setRemWhen = _rw[1];
  var _rn = useState("");
  var remNotice = _rn[0]; var setRemNotice = _rn[1];

  function setField(key, val) {
    setForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }
  function setEditField(key, val) {
    setEditForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }

  function pickCur(sym) {
    setForm(function(prev) {
      var next = {}; for (var k in prev) next[k] = prev[k];
      next.cur = sym; next.rateLoading = sym !== mainSym; next.rateFallback = false;
      if (sym === mainSym) next.rate = 1;
      return next;
    });
    if (sym === mainSym) return;
    fetchRate(sym, mainSym, function(rate, fb) {
      setForm(function(prev) {
        if (prev.cur !== sym) return prev;
        var next = {}; for (var k in prev) next[k] = prev[k];
        next.rate = rate; next.rateLoading = false; next.rateFallback = fb;
        return next;
      });
    });
  }
  function pickEditCur(sym) {
    setEditForm(function(prev) {
      var next = {}; for (var k in prev) next[k] = prev[k];
      next.cur = sym; next.rateLoading = sym !== mainSym; next.rateFallback = false;
      if (sym === mainSym) next.rate = 1;
      return next;
    });
    if (sym === mainSym) return;
    fetchRate(sym, mainSym, function(rate, fb) {
      setEditForm(function(prev) {
        if (prev.cur !== sym) return prev;
        var next = {}; for (var k in prev) next[k] = prev[k];
        next.rate = rate; next.rateLoading = false; next.rateFallback = fb;
        return next;
      });
    });
  }

  var pressTimer = useRef(null);
  var longFired = useRef(false);
  function startLongPress(n) {
    longFired.current = false;
    pressTimer.current = setTimeout(function() {
      longFired.current = true;
      setActNote(n);
      setRemWhen(n.reminder ? toLocalInput(n.reminder.due) : "");
      setRemNotice("");
      pressTimer.current = null;
    }, 500);
  }
  function cancelLongPress() {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }
  function rowClick(n) {
    if (longFired.current) { longFired.current = false; return; }
    openEdit(n);
  }

  function openEdit(n) {
    setEditNote(n);
    var hasForeign = n.origCur && n.origCur !== mainSym;
    setEditForm({ dir: n.dir, amount: String(hasForeign ? n.origAmount : n.amount), label: n.label, catId: n.catId || "", date: n.date,
      cur: hasForeign ? n.origCur : mainSym, rate: hasForeign ? (n.rate || fxStaticRate(n.origCur, mainSym)) : 1, rateLoading: false, rateFallback: false });
  }

  function add() {
    if (!form.amount || !form.label) return;
    var c = catById(cats, form.catId) || cats[0] || { id: "", name: "Other" };
    var entered = parseFloat(form.amount);
    var foreign = form.cur && form.cur !== mainSym;
    var rate = foreign ? (form.rate || fxStaticRate(form.cur, mainSym)) : 1;
    var mainAmount = round2(entered * rate);
    var note = { id: Date.now(), dir: form.dir, amount: mainAmount, label: form.label, catId: c.id, category: c.name, date: form.date, reminder: null };
    if (foreign) { note.origAmount = entered; note.origCur = form.cur; note.rate = rate; }
    props.onSaveNotes(props.notes.concat([note]));
    setForm(blankForm);
    props.setSheetOpen(false);
  }

  function saveEdit() {
    if (!editForm.amount || !editForm.label || !editNote) return;
    var c = catById(cats, editForm.catId) || cats[0] || { id: "", name: "Other" };
    var entered = parseFloat(editForm.amount);
    var foreign = editForm.cur && editForm.cur !== mainSym;
    var rate = foreign ? (editForm.rate || fxStaticRate(editForm.cur, mainSym)) : 1;
    var mainAmount = round2(entered * rate);
    props.onSaveNotes(props.notes.map(function(n) {
      if (n.id !== editNote.id) return n;
      var nn = { id: n.id, dir: editForm.dir, amount: mainAmount, label: editForm.label, catId: c.id, category: c.name, date: editForm.date, reminder: n.reminder || null };
      if (foreign) { nn.origAmount = entered; nn.origCur = editForm.cur; nn.rate = rate; }
      return nn;
    }));
    setEditNote(null);
  }

  function deleteNote() {
    if (!editNote) return;
    props.onSaveNotes(props.notes.filter(function(x) { return x.id !== editNote.id; }));
    setEditNote(null);
  }

  function doSettle() {
    var n = settleNote;
    if (!n) return;
    setSettleNote(null);
    var nextNotes = props.notes.filter(function(x) { return x.id !== n.id; });
    if (addToBalance) {
      var t = { id: n.id, type: n.dir === "owed" ? "income" : "expense", amount: n.amount, label: n.label, catId: n.catId || "", category: n.category || "", date: new Date().toISOString().slice(0, 10), repeat: "none", pending: false };
      if (n.origCur) { t.origAmount = n.origAmount; t.origCur = n.origCur; t.rate = n.rate; }
      props.onSettleNote(props.tx.concat([t]), nextNotes);
    } else {
      props.onSaveNotes(nextNotes);
    }
  }

  function applyReminder() {
    var n = actNote;
    if (!n || !remWhen) return;
    var due = new Date(remWhen).getTime();
    if (isNaN(due)) return;
    var updated = props.notes.map(function(x) {
      if (x.id !== n.id) return x;
      var nn = {}; for (var k in x) nn[k] = x[k];
      nn.reminder = { due: due, fired: false };
      return nn;
    });
    ensureNotifyPermission(function(granted) {
      props.onSaveNotes(updated);
      if (granted) { setActNote(null); }
      else { setRemNotice(tr("reminderDenied")); }
    });
  }
  function clearReminder() {
    var n = actNote;
    if (!n) return;
    props.onSaveNotes(props.notes.map(function(x) {
      if (x.id !== n.id) return x;
      var nn = {}; for (var k in x) nn[k] = x[k];
      nn.reminder = null;
      return nn;
    }));
    setActNote(null);
  }

  var sorted = props.notes.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
  var groups = {};
  sorted.forEach(function(n) {
    if (!groups[n.date]) groups[n.date] = [];
    groups[n.date].push(n);
  });
  var dates = Object.keys(groups).sort(function(a, b) { return b.localeCompare(a); });
  var owedToMe = props.notes.reduce(function(s, n) { return n.dir === "owed" ? s + n.amount : s; }, 0);
  var iOwe = props.notes.reduce(function(s, n) { return n.dir === "owe" ? s + n.amount : s; }, 0);

  return (
    <div>
      <SubViewBack onBack={props.onBack} label={tr("activity")} />

      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title={tr("newNote")}>
        <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
          {["owed","owe"].map(function(opt) {
            var on = form.dir === opt;
            return (
              <button key={opt} onClick={function() { setField("dir", opt); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: UI,
                  background: on ? (opt === "owed" ? T.greenDim : T.orangeDim) : "rgba(0,0,0,0.04)",
                  color: on ? (opt === "owed" ? T.green : T.orange) : T.ink3 }}>
                {opt === "owed" ? tr("theyOweMe") : tr("iOwe")}
              </button>
            );
          })}
        </div>
        <AmountField value={form.amount} onAmount={function(e) { setField("amount", e.target.value); }} cur={form.cur} onCur={pickCur} mainSym={mainSym} rate={form.rate} rateLoading={form.rateLoading} rateFallback={form.rateFallback} />
        <FormRow label={tr("txLabel")} value={form.label} onChange={function(e) { setField("label", e.target.value); }} placeholder="Dinner, loan, ticket..." />
        <CatPicker label={tr("category")} categories={cats} value={form.catId} onChange={function(id) { setField("catId", id); }} onManage={props.onManageCategories} />
        <FormRow label={tr("date")} value={form.date} onChange={function(e) { setField("date", e.target.value); }} type="date" last={true} />
        <BigBtn label={tr("addNote")} onPress={add} disabled={!form.amount || !form.label} />
      </Overlay>

      <Overlay open={!!editNote} onClose={function() { setEditNote(null); }} title={tr("editNote")}>
        <div style={{ display: "flex", gap: 7, marginBottom: 7 }}>
          {["owed","owe"].map(function(opt) {
            var on = editForm.dir === opt;
            return (
              <button key={opt} onClick={function() { setEditField("dir", opt); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: UI,
                  background: on ? (opt === "owed" ? T.greenDim : T.orangeDim) : "rgba(0,0,0,0.04)",
                  color: on ? (opt === "owed" ? T.green : T.orange) : T.ink3 }}>
                {opt === "owed" ? tr("theyOweMe") : tr("iOwe")}
              </button>
            );
          })}
        </div>
        <AmountField value={editForm.amount} onAmount={function(e) { setEditField("amount", e.target.value); }} cur={editForm.cur} onCur={pickEditCur} mainSym={mainSym} rate={editForm.rate} rateLoading={editForm.rateLoading} rateFallback={editForm.rateFallback} />
        <FormRow label={tr("txLabel")} value={editForm.label} onChange={function(e) { setEditField("label", e.target.value); }} placeholder="Dinner, loan, ticket..." />
        <CatPicker label={tr("category")} categories={cats} value={editForm.catId} onChange={function(id) { setEditField("catId", id); }} onManage={props.onManageCategories} />
        <FormRow label={tr("date")} value={editForm.date} onChange={function(e) { setEditField("date", e.target.value); }} type="date" last={true} />
        <BigBtn label={tr("saveNote")} onPress={saveEdit} disabled={!editForm.amount || !editForm.label} />
        <button onClick={deleteNote}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>
          {tr("deleteNote")}
        </button>
      </Overlay>

      <Overlay open={!!settleNote} onClose={function() { setSettleNote(null); }} title={tr("settleTitle")}>
        {settleNote && (
          <div style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(0,0,0,0.04)", borderRadius: 13, padding: "12px 14px", marginBottom: 9 }}>
            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "2px 7px", letterSpacing: "0.02em", color: settleNote.dir === "owed" ? T.green : T.orange, background: settleNote.dir === "owed" ? T.greenGlow : T.orangeGlow }}>
              {settleNote.dir === "owed" ? tr("theyOweMe") : tr("iOwe")}
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{settleNote.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(settleNote.amount)}</span>
          </div>
        )}
        <button onClick={function() { setAddToBalance(!addToBalance); }}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 13px", borderRadius: 11, border: "none", cursor: "pointer", marginBottom: 8,
            background: addToBalance ? T.greenDim : "rgba(0,0,0,0.04)", fontFamily: UI }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: addToBalance ? T.green : T.ink2 }}>{tr("settleAddBalance")}</span>
          <div style={{ width: 18, height: 18, borderRadius: 6, border: "2px solid " + (addToBalance ? T.green : T.ink3), background: addToBalance ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {addToBalance && <SVGIcon id="check" size={10} color="#fff" />}
          </div>
        </button>
        <BigBtn label={tr("settle")} onPress={doSettle} />
      </Overlay>

      <Overlay open={!!actNote} onClose={function() { setActNote(null); }} title={tr("reminderTitle")}>
        {actNote && (
          <div style={{ display: "flex", alignItems: "center", gap: 11, background: "rgba(0,0,0,0.04)", borderRadius: 13, padding: "12px 14px", marginBottom: 9 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{actNote.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(actNote.amount)}</span>
          </div>
        )}
        <FormRow label={tr("reminderWhen")} value={remWhen} onChange={function(e) { setRemWhen(e.target.value); }} type="datetime-local" last={true} />
        {remNotice && (
          <div style={{ fontSize: 12, color: T.ink2, background: T.goldDim, borderRadius: 9, padding: "8px 12px", marginTop: 8, lineHeight: 1.4 }}>{remNotice}</div>
        )}
        <BigBtn label={tr("setReminder")} onPress={applyReminder} disabled={!remWhen} />
        {actNote && actNote.reminder && (
          <button onClick={clearReminder}
            style={{ width: "100%", background: "none", border: "none", color: T.ink2, fontSize: 13, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 8, padding: "5px 0" }}>
            {tr("clearReminder")}
          </button>
        )}
      </Overlay>

      {props.notes.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.green, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tr("theyOweMe")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(owedToMe)}</div>
          </div>
          <div style={{ flex: 1, background: T.card, borderRadius: 16, padding: "14px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tr("iOwe")}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(iOwe)}</div>
          </div>
        </div>
      )}

      {props.notes.length === 0 && (
        <Card style={{ padding: "46px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="note" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{tr("notesEmpty")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("notesEmptySub")}</div>
        </Card>
      )}

      {dates.map(function(date) {
        var dayItems = groups[date];
        return (
          <div key={date} style={{ marginBottom: 20 }}>
            <div style={{ padding: "0 4px 8px" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dateLabel(date)}</span>
            </div>
            <Card style={{ overflow: "hidden" }}>
              {dayItems.map(function(n, i) {
                var c = resolveCat(cats, n);
                var owed = n.dir === "owed";
                var overdue = n.reminder && !n.reminder.fired && n.reminder.due < Date.now();
                return (
                  <div key={n.id}
                    onMouseDown={function() { startLongPress(n); }}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onTouchStart={function() { startLongPress(n); }}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onContextMenu={function(e) { e.preventDefault(); }}
                    onClick={function() { rowClick(n); }}
                    style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 16px", borderBottom: i < dayItems.length - 1 ? "0.5px solid " + T.sep : "none", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none" }}>
                    <button onClick={function(e) { e.stopPropagation(); setSettleNote(n); setAddToBalance(true); }}
                      onMouseDown={function(e) { e.stopPropagation(); }} onTouchStart={function(e) { e.stopPropagation(); }} title={tr("settle")}
                      style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", border: "2px solid " + T.ink3, background: "transparent", cursor: "pointer", padding: 0 }} />
                    <CatBadge icon={c.icon} color={c.color} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, color: T.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.label}</div>
                      <div style={{ fontSize: 12, color: T.ink3, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                          {c.name}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "1px 6px", letterSpacing: "0.02em", color: owed ? T.green : T.orange, background: owed ? T.greenGlow : T.orangeGlow }}>
                          {owed ? tr("theyOweMe") : tr("iOwe")}
                        </span>
                        {n.origCur && n.origCur !== _currency.sym && <span style={{ fontSize: 10, fontWeight: 700, color: T.gold, background: T.goldGlow, borderRadius: 5, padding: "1px 6px", letterSpacing: "0.02em" }}>{fmtCur(n.origCur, n.origAmount)}</span>}
                        {n.reminder && <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: "1px 6px", color: overdue ? T.red : T.gold, background: overdue ? T.redDim : T.goldGlow }}>{overdue ? tr("overdue") : tr("due")}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize: 15.5, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{dollars(n.amount)}</span>
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function Budgets(props) {
  var cats = props.categories || [];
  var _s = useState(null);
  var editId = _s[0]; var setEditId = _s[1];
  var _v = useState("");
  var val = _v[0]; var setVal = _v[1];
  var _nb = useState({ catId: "", limit: "" });
  var nb = _nb[0]; var setNb = _nb[1];

  function spentForCat(c) {
    return props.tx.filter(function(t) { return t.type === "expense" && (t.catId === c.id || t.category === c.name); }).reduce(function(s, t) { return s + t.amount; }, 0);
  }

  var rows = props.budgets.map(function(b) {
    var c = catById(cats, b.catId) || catByName(cats, b.category) || { id: b.catId, name: b.category || "Budget", color: T.orange, icon: "box" };
    var s = spentForCat(c);
    return { catId: b.catId, cat: c, limit: b.limit, spent: s, over: s > b.limit && b.limit > 0 };
  });

  var totalSpent = rows.reduce(function(s, r) { return s + r.spent; }, 0);
  var totalLimit = rows.reduce(function(s, r) { return s + r.limit; }, 0);
  var totalPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  // Storage-style segmented bar: each category's share of total spend.
  var segs = rows.slice().filter(function(r){ return r.spent > 0; }).sort(function(a,b){ return b.spent - a.spent; });
  var segTotal = segs.reduce(function(s, r){ return s + r.spent; }, 0);

  var used = {};
  props.budgets.forEach(function(b) { used[b.catId] = true; });
  var avail = cats.filter(function(c) { return !used[c.id]; });

  return (
    <div>
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title={tr("newBudget")}>
        {avail.length === 0 ? (
          <div style={{ padding: "20px 4px 8px", textAlign: "center", color: T.ink3, fontSize: 14 }}>{tr("allCatsHaveBudget")}</div>
        ) : (
          <div>
            <CatPicker label={tr("category")} categories={avail} value={nb.catId || (avail[0] || {}).id} onChange={function(id) { setNb(function(p){ return { catId: id, limit: p.limit }; }); }} onManage={props.onManageCategories} />
            <FormRow label={tr("monthlyLimit")} value={nb.limit} onChange={function(e) { setNb(function(p){ return { catId: p.catId || (avail[0]||{}).id, limit: e.target.value }; }); }} type="number" last={true} />
            <BigBtn label={tr("addBudget")} disabled={!nb.limit} onPress={function() {
              var n = parseFloat(nb.limit);
              var cid = nb.catId || (avail[0] || {}).id;
              if (n > 0 && cid) {
                var c = catById(cats, cid);
                props.onSaveBudgets(props.budgets.concat([{ catId: cid, category: c ? c.name : "", limit: n }]));
              }
              setNb({ catId: "", limit: "" });
              props.setSheetOpen(false);
            }} />
          </div>
        )}
      </Overlay>

      <Overlay open={!!editId} onClose={function() { setEditId(null); }} title={tr("editLimit")}>
        <FormRow label={tr("monthlyLimit")} value={val} onChange={function(e) { setVal(e.target.value); }} type="number" last={true} />
        <BigBtn label={tr("save")} onPress={function() {
          var n = parseFloat(val);
          if (n > 0) props.onSaveBudgets(props.budgets.map(function(b) { return b.catId === editId ? { catId: b.catId, category: b.category, limit: n } : b; }));
          setEditId(null);
        }} />
        <button onClick={function() { props.onSaveBudgets(props.budgets.filter(function(b){ return b.catId !== editId; })); setEditId(null); }}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 12, padding: "6px 0" }}>
          {tr("removeBudget")}
        </button>
      </Overlay>

      {props.budgets.length === 0 && (
        <Card style={{ padding: "46px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="budgets" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{tr("noBudgets")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("noBudgetsSub")}</div>
        </Card>
      )}

      {props.budgets.length > 0 && (
        <Card style={{ padding: "20px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>{tr("totalSpent")}</div>
              <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: totalSpent > totalLimit ? T.red : T.ink, lineHeight: 1.1, marginTop: 4 }}>
                {dollars(totalSpent)}
              </div>
              <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>{"of " + dollars(totalLimit) + " " + tr("budgeted")}</div>
            </div>
            <div style={{ position: "relative" }}>
              <RingChart value={totalSpent} max={totalLimit} size={72} color={totalPct > 85 ? T.red : T.orange} stroke={6} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: totalPct > 85 ? T.red : T.ink2 }}>
                {totalPct}%
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", height: 12, borderRadius: 8, overflow: "hidden", gap: 2, background: "rgba(0,0,0,0.05)" }}>
              {segTotal > 0 ? segs.map(function(r) {
                return <div key={r.cat.id} title={r.cat.name} style={{ width: (r.spent / segTotal * 100) + "%", background: r.over ? T.red : r.cat.color, height: "100%" }} />;
              }) : <div style={{ width: "100%" }} />}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 12 }}>
              {segs.slice(0, 6).map(function(r) {
                var pct = Math.round(r.spent / segTotal * 100);
                return (
                  <div key={r.cat.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: r.cat.color, display: "inline-block" }} />
                    <span style={{ fontSize: 12, color: T.ink2, fontWeight: 500 }}>{r.cat.name}</span>
                    <span style={{ fontSize: 12, color: T.ink3 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {props.budgets.length > 0 && (
        <div>
          <div style={{ padding: "0 4px 10px" }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, letterSpacing: "-0.02em" }}>{tr("byCategory")}</span>
          </div>
          <Card style={{ overflow: "hidden" }}>
            {rows.map(function(r, i) {
              var pct = r.limit > 0 ? Math.round((r.spent / r.limit) * 100) : 0;
              return (
                <div key={r.catId || i} style={{ borderBottom: i < rows.length - 1 ? "0.5px solid " + T.sep : "none" }}>
                  <div style={{ padding: "14px 16px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 9 }}>
                      <CatBadge icon={r.cat.icon} color={r.cat.color} size={34} soft={true} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 15, color: T.ink, fontWeight: 600 }}>{r.cat.name}</span>
                      </div>
                      {r.over && <span style={{ fontSize: 10, fontWeight: 700, color: T.red, background: T.red + "1A", borderRadius: 7, padding: "2px 8px", letterSpacing: "0.02em" }}>OVER</span>}
                      <span style={{ color: T.orange, fontSize: 14, fontWeight: 700 }}>{dollars(r.limit)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={r.spent} max={r.limit} color={r.over ? T.red : r.cat.color} h={6} />
                      </div>
                      <span style={{ fontSize: 12, minWidth: 70, textAlign: "right", color: r.over ? T.red : T.ink3, fontWeight: 500 }}>{dollars(r.spent)} ({pct}%)</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", borderTop: "0.5px solid " + T.sep }}>
                    <button onClick={function() { setEditId(r.catId); setVal(String(r.limit)); }}
                      style={{ flex: 1, background: "none", border: "none", borderRight: "0.5px solid " + T.sep, padding: "11px 0", color: T.orange, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>
                      {tr("edit")}
                    </button>
                    <button onClick={function() { props.onSaveBudgets(props.budgets.filter(function(b) { return b.catId !== r.catId; })); }}
                      style={{ flex: 1, background: "none", border: "none", padding: "11px 0", color: T.red, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: UI }}>
                      {tr("delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}

function Goals(props) {
  var _f = useState({ name: "", target: "", saved: "" });
  var form = _f[0]; var setForm = _f[1];
  var _a = useState(null);
  var addSheet = _a[0]; var setAddSheet = _a[1];
  var _am = useState("");
  var addAmt = _am[0]; var setAddAmt = _am[1];
  var _eg = useState(null);
  var editGoal = _eg[0]; var setEditGoal = _eg[1];
  var _ef = useState({ name: "", target: "" });
  var editForm = _ef[0]; var setEditForm = _ef[1];

  function setField(key, val) {
    setForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }
  function setEditField(key, val) {
    setEditForm(function(prev) {
      var next = {};
      for (var k in prev) next[k] = prev[k];
      next[key] = val;
      return next;
    });
  }

  return (
    <div>
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title={tr("newBudgetBook")}>
        <FormRow label={tr("name")} value={form.name} onChange={function(e) { setField("name", e.target.value); }} />
        <FormRow label={tr("target")} value={form.target} onChange={function(e) { setField("target", e.target.value); }} type="number" />
        <FormRow label={tr("alreadySaved")} value={form.saved} onChange={function(e) { setField("saved", e.target.value); }} type="number" last={true} />
        <BigBtn label={tr("createBudgetBook")} disabled={!form.name || !form.target} onPress={function() {
          props.onSaveGoals(props.goals.concat([{ id: Date.now(), name: form.name, target: parseFloat(form.target), saved: parseFloat(form.saved) || 0 }]));
          setForm({ name: "", target: "", saved: "" });
          props.setSheetOpen(false);
        }} />
      </Overlay>

      <Overlay open={!!editGoal} onClose={function() { setEditGoal(null); }} title={tr("editBudgetBook")}>
        <FormRow label={tr("name")} value={editForm.name} onChange={function(e) { setEditField("name", e.target.value); }} />
        <FormRow label={tr("target")} value={editForm.target} onChange={function(e) { setEditField("target", e.target.value); }} type="number" last={true} />
        <BigBtn label={tr("saveChanges")} disabled={!editForm.name || !editForm.target} onPress={function() {
          var n = parseFloat(editForm.target);
          if (editGoal && editForm.name && n > 0) {
            props.onSaveGoals(props.goals.map(function(g) {
              return g.id === editGoal.id ? { id: g.id, name: editForm.name, target: n, saved: g.saved } : g;
            }));
          }
          setEditGoal(null);
        }} />
        <button onClick={function() { props.onSaveGoals(props.goals.filter(function(x) { return x.id !== editGoal.id; })); setEditGoal(null); }}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 12, padding: "6px 0" }}>
          {tr("deleteBudgetBook")}
        </button>
      </Overlay>

      <Overlay open={!!addSheet} onClose={function() { setAddSheet(null); }} title={addSheet ? addSheet.name : ""}>
        <FormRow label={tr("amount")} value={addAmt} onChange={function(e) { setAddAmt(e.target.value); }} type="number" last={true} />
        <BigBtn label={tr("addToBudgetBook")} disabled={!addAmt} onPress={function() {
          var n = parseFloat(addAmt);
          if (n && addSheet) {
            props.onSaveGoals(props.goals.map(function(g) {
              return g.id === addSheet.id ? { id: g.id, name: g.name, target: g.target, saved: Math.min(g.target, g.saved + n) } : g;
            }));
          }
          setAddSheet(null);
          setAddAmt("");
        }} />
      </Overlay>

      {props.goals.length === 0 && (
        <Card style={{ padding: "46px 24px", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <SVGIcon id="goals" size={24} color={T.orange} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{tr("noGoals")}</div>
          <div style={{ fontSize: 13, color: T.ink3, lineHeight: 1.5 }}>{tr("noGoalsSub")}</div>
        </Card>
      )}

      {props.goals.map(function(g) {
        var pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        var done = g.saved >= g.target;
        return (
          <Card key={g.id} style={{ marginBottom: 14, overflow: "hidden" }}>
            <div style={{ padding: "18px 18px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: T.ink }}>{g.name}</div>
                  <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>
                    {done ? tr("goalComplete") : dollars(g.target - g.saved) + " " + tr("remaining")}
                  </div>
                </div>
                <div style={{ position: "relative" }}>
                  <RingChart value={g.saved} max={g.target} size={60} color={done ? T.green : T.orange} stroke={5} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: done ? T.green : T.orange }}>
                    {pct}%
                  </div>
                </div>
              </div>
              <ProgressBar value={g.saved} max={g.target} color={done ? T.green : T.orange} h={6} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(g.saved)}</span>
                <span style={{ fontSize: 11, color: T.ink3 }}>{dollars(g.target)}</span>
              </div>
            </div>
            <div style={{ display: "flex", borderTop: "0.5px solid " + T.sep }}>
              {!done && (
                <button onClick={function() { setAddSheet(g); setAddAmt(""); }}
                  style={{ flex: 1, background: "none", border: "none", borderRight: "0.5px solid " + T.sep, padding: "13px 0", color: T.orange, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                  {"+ " + tr("add")}
                </button>
              )}
              <button onClick={function() { setEditGoal(g); setEditForm({ name: g.name, target: String(g.target) }); }}
                style={{ flex: 1, background: "none", border: "none", padding: "13px 0", color: T.ink2, fontSize: 15, cursor: "pointer", borderRight: "0.5px solid " + T.sep }}>
                {tr("edit")}
              </button>
              <button onClick={function() { props.onSaveGoals(props.goals.filter(function(x) { return x.id !== g.id; })); }}
                style={{ flex: 1, background: "none", border: "none", padding: "13px 0", color: T.red, fontSize: 15, cursor: "pointer" }}>
                {tr("delete")}
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function callClaude(messages, system, maxTokens, callback) {
  var apiUrl = (location.hostname === "localhost" || location.hostname === "127.0.0.1" || location.protocol === "data:" || location.protocol === "file:") ? "https://richy-mgkl.vercel.app/api/chat" : "/api/chat";
  fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: messages,
      system: system,
      maxTokens: maxTokens || 800,
    }),
  }).then(function(res) {
    return res.text().then(function(raw) {
      var data;
      try { data = JSON.parse(raw); } catch(e) {
        callback(new Error("Bad JSON from server: " + raw.slice(0, 100)), null); return;
      }
      if (data.error) {
        callback(new Error(data.error.type + ": " + data.error.message), null); return;
      }
      if (!data.content || !Array.isArray(data.content)) {
        callback(new Error("Unexpected response: " + JSON.stringify(data).slice(0, 100)), null); return;
      }
      var text = "";
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === "text") text += data.content[i].text;
      }
      callback(null, text.trim());
    });
  }).catch(function(err) { callback(new Error("Fetch failed: " + err.message), null); });
}

function Advisor(props) {
  var _a = useState(null);
  var advice = _a[0]; var setAdvice = _a[1];
  var _l = useState(false);
  var loading = _l[0]; var setLoading = _l[1];
  var _em = useState("");
  var errMsg = _em[0]; var setErrMsg = _em[1];
  var _c = useState([]);
  var chat = _c[0]; var setChat = _c[1];
  var _in = useState("");
  var input = _in[0]; var setInput = _in[1];
  var _cl = useState(false);
  var chatLoading = _cl[0]; var setChatLoading = _cl[1];
  var _pa = useState(null);
  var pendingAction = _pa[0]; var setPendingAction = _pa[1];

  var cats = props.categories || [];
  var income = props.tx.filter(function(t) { return t.type === "income"; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var expense = props.tx.filter(function(t) { return t.type === "expense"; }).reduce(function(s, t) { return s + t.amount; }, 0);
  var savings = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  var topCats = cats.map(function(c) { return { name: c.name, spent: catSpend(c) }; }).filter(function(c) { return c.spent > 0; }).sort(function(a, b) { return b.spent - a.spent; }).slice(0, 5);
  var budgetLines = props.budgets.map(function(b) {
    var c = catById(cats, b.catId) || catByName(cats, b.category) || { name: b.category || "?" };
    var sp = catSpend(c);
    return c.name + " $" + sp + "/$" + b.limit;
  });
  var ctx = "User: " + props.username + ". Income: $" + income + ". Expenses: $" + expense + ". Net balance: $" + (income - expense) + ". Savings rate: " + savings + "%. Top spending categories: " + (topCats.map(function(c) { return c.name + " $" + c.spent; }).join(", ") || "none") + ". Budgets: " + (budgetLines.join(", ") || "none set") + ". Goals: " + (props.goals.map(function(g) { return g.name + " $" + g.saved + "/$" + g.target; }).join(", ") || "none") + ". Personalized plan: " + (props.plan ? props.plan.slice(0, 300) + "..." : "not yet created") + ".";

  function catSpend(c) {
    return props.tx.filter(function(t) { return t.type === "expense" && (t.catId === c.id || t.category === c.name); }).reduce(function(s, t) { return s + t.amount; }, 0);
  }

  function localAnalysis() {
    var topName = "Other";
    var topVal = 0;
    for (var ci = 0; ci < cats.length; ci++) {
      var cv = catSpend(cats[ci]);
      if (cv > topVal) { topVal = cv; topName = cats[ci].name; }
    }
    var score = 50;
    if (savings >= 20) score = 85;
    else if (savings >= 10) score = 70;
    else if (savings >= 0) score = 55;
    else score = 30;
    var label = score >= 80 ? "Excellent" : score >= 65 ? "Good" : score >= 50 ? "Fair" : "Needs Work";
    var insights = [];
    if (savings >= 20) {
      insights.push({ type: "strength", title: "Strong Savings Rate", body: "You are saving " + savings + "% of your income, well above the recommended 20%. This builds long-term wealth fast." });
    } else if (savings >= 0) {
      insights.push({ type: "tip", title: "Grow Your Savings Rate", body: "You save " + savings + "% right now. Aim for 20% by trimming one or two recurring expenses." });
    } else {
      insights.push({ type: "warning", title: "Spending Exceeds Income", body: "You are spending more than you earn this period. Review your largest categories and cut back where possible." });
    }
    if (topVal > 0) {
      insights.push({ type: "tip", title: "Watch " + topName + " Spending", body: topName + " is your biggest expense at " + dollars(topVal) + ". Small reductions here have the largest impact on your budget." });
    }
    insights.push({ type: "strength", title: "You Are Tracking", body: "Simply recording your transactions puts you ahead of most people. Consistency is the foundation of financial health." });
    var quotes = [
      { quote: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
      { quote: "It is not about how much money you make, but how much money you keep.", author: "Robert Kiyosaki" },
      { quote: "Wealth is not about having a lot of money. It is about having a lot of options.", author: "Chris Rock" },
      { quote: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
      { quote: "Compound interest is the eighth wonder of the world. He who understands it earns it.", author: "Albert Einstein" },
      { quote: "A part of all you earn is yours to keep. Pay yourself first.", author: "George Clason" },
      { quote: "Someone is sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett" },
      { quote: "The goal is not to be rich. The goal is to be free.", author: "T. Harv Eker" },
      { quote: "Financial peace is not the acquisition of stuff. It is learning to live on less than you make.", author: "Dave Ramsey" },
      { quote: "You must gain control over your money or the lack of it will forever control you.", author: "Dave Ramsey" },
      { quote: "The stock market is a device for transferring money from the impatient to the patient.", author: "Warren Buffett" },
      { quote: "Wealth is the ability to fully experience life.", author: "Henry David Thoreau" },
      { quote: "It is not the man who has too little, but the man who craves more, who is poor.", author: "Seneca" },
      { quote: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
      { quote: "Savings without a mission is garbage. Your money must have a purpose.", author: "Clarissa Explains It All" },
      { quote: "A wise man should have money in his head, but not in his heart.", author: "Jonathan Swift" },
      { quote: "The more you learn, the more you earn.", author: "Warren Buffett" },
      { quote: "Never spend your money before you have earned it.", author: "Thomas Jefferson" },
      { quote: "Wealth is not his who has it, but his who enjoys it.", author: "Benjamin Franklin" },
      { quote: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
      { quote: "The habit of saving is itself an education; it fosters every virtue.", author: "T.T. Munger" },
      { quote: "Time is your most valuable asset. Invest it wisely.", author: "Morgan Housel" },
      { quote: "Spend less than you make, save the difference, and be patient.", author: "Morgan Housel" },
      { quote: "Risk is what is left over when you think you have thought of everything.", author: "Carl Richards" },
      { quote: "The best time to invest was yesterday. The second best time is today.", author: "Proverb" }
    ];
    var tips = [
      { title: "The 50/30/20 Rule", body: "Put 50% of income toward needs, 30% toward wants, 20% toward savings. Morgan Housel says savings rate matters more than investment returns early on." },
      { title: "Pay Yourself First", body: "The Richest Man in Babylon: keep 10% of everything you earn. Automate this transfer on payday before you can spend it." },
      { title: "The Latte Factor", body: "Small daily purchases of $5-$10 compound to $75,000+ over 30 years. Audit your recurring small expenses quarterly." },
      { title: "Avoid Lifestyle Inflation", body: "The Millionaire Next Door found most millionaires kept lifestyle flat when income rose, investing the difference instead." },
      { title: "Build Your Emergency Fund First", body: "Dave Ramsey and Ramit Sethi both say: 3-6 months expenses in cash before any investing. This prevents derailing long-term plans." }
    ];
    var q = quotes[Math.floor(Math.random() * quotes.length)];
    var tip = tips[Math.floor(Math.random() * tips.length)];
    return {
      score: score,
      scoreLabel: label,
      headline: savings >= 20 ? "Great work, your finances are on a strong footing." : savings >= 0 ? "You are on track, with room to save more." : "Time to rein in spending and rebuild your cushion.",
      insights: insights,
      expertQuote: q,
      webInsight: tip
    };
  }

  function Richard(question) {
    var q = question.toLowerCase().trim();
    var topCat = cats.map(function(c) {
      return { name: c.name, val: catSpend(c) };
    }).sort(function(a, b) { return b.val - a.val; })[0];
    var monthlySpend = expense;
    var surplus = income - expense;

    function has() {
      for (var i = 0; i < arguments.length; i++) {
        if (q.indexOf(arguments[i]) !== -1) return true;
      }
      return false;
    }

    // ===== SMALL TALK =====
    if (q === "hi" || q === "hey" || q === "yo" || q === "hello" || has("hello ", "hi ", "hey ", "good morning", "good evening")) {
      return "Hey! I'm your finance advisor. Ask me anything - saving more, whether your budget's healthy, investing, debt, emergency funds, buying a house or car, retirement, taxes, credit, or how the wealthy actually manage money. What's on your mind?";
    }
    if (has("what can you do", "what do you know", "how can you help", "what are you")) {
      return "I analyze your spending and advise on: saving strategies, budgeting, investing, debt payoff, emergency funds, retirement and FIRE, big purchases, taxes, credit scores, raising money-smart kids, and the principles behind real wealth. You're at " + dollars(income) + " income, " + dollars(expense) + " spent, " + savings + "% saved. What should we dig into?";
    }
    if (has("thank", "appreciate", "helpful", "great advice")) {
      return "Anytime. Wealth is built through small consistent decisions - keep checking in and adjusting. What else can I help with?";
    }

    // ===== EMOTIONAL / INTENT (checked early, before keyword topics) =====
    if (has("stressed", "anxious", "worried", "scared", "overwhelmed", "depressed", "feel broke", "feeling broke", "paycheck to paycheck", "drowning")) {
      return "I hear you - money stress is heavy, and you're not alone in it. Let's make it smaller and concrete. First, list your absolute essentials (housing, food, utilities, minimum debt payments). Everything above that is where we find breathing room. Even setting aside $10 builds the habit and the sense of control. What's the one bill or expense weighing on you most right now? We'll start there.";
    }
    if (has("hate budget", "budgeting is hard", "budgeting is confusing", "so confusing", "too confusing", "dont understand", "don't understand", "too complicated", "hate this", "this is hard", "im lost", "i'm lost")) {
      return "Totally fair - most budgeting advice is needlessly complicated. Here's the whole thing in one line: spend less than you earn, and put the difference somewhere it grows. That's it. Start by just tracking what you spend for one week here - no judgment, no rules. Awareness alone changes behavior. Want me to set up a dead-simple plan for you?";
    }
    if (has("just paid off", "paid it off", "reached my goal", "hit my goal", "i did it", "im proud", "i'm proud", "i saved", "finally saved")) {
      return "That's genuinely worth celebrating - well done. Progress like this compounds, both in your balance and your confidence. The key now is to lock in the habit: keep the same routine going so this becomes your normal, not a one-time win. What's the next goal you want to aim at?";
    }
    if (has("loan for a vacation", "loan for vacation", "borrow for a vacation", "finance a vacation", "loan for a trip", "loan for a holiday", "borrow for a trip")) {
      return "I'd be cautious here. Borrowing for a vacation means paying interest on a memory - the trip ends but the debt lingers, often at high rates. A better path: open a separate savings 'sinking fund', decide your budget and date, and divide it into monthly chunks. Want $3,000 in 10 months? That's $300/month, and you arrive debt-free. The trip will feel a lot better when it's already paid for.";
    }

    // ===== COMPOUND INTEREST (must come before 'interest'/'debt') =====
    if (has("compound interest", "compounding", "compound")) {
      return "Compound interest is earning returns on your returns - Einstein supposedly called it the eighth wonder of the world. Example: $10,000 at 8% becomes ~$100,000 in 30 years without adding a cent. The two levers are TIME and RATE, which is why starting early matters more than starting big. Every year you wait costs you the largest, final compounding years.";
    }

    // ===== ROTH IRA / 401k / specific accounts =====
    if (has("roth", "ira", "401k", "403b", "retirement account", "tax advantaged")) {
      return "A Roth IRA lets you invest after-tax money that then grows and is withdrawn completely tax-free in retirement - ideal if you expect to earn more later. A traditional 401k/IRA gives you the tax break now instead. Priority order: (1) 401k up to any employer match (free money), (2) max a Roth IRA, (3) back to maxing the 401k, (4) taxable brokerage. In 2026 the IRA limit is around $7,000/year.";
    }

    // ===== SPECIFIC STOCKS / CRYPTO =====
    if (has("what stock", "which stock", "stock should", "stock to buy", "pick stocks", "individual stock")) {
      return "I can't pick individual stocks for you - and honestly, neither should most people try. Buffett's advice for nearly everyone: a low-cost S&P 500 index fund beats ~90% of professional stock pickers over a decade and you never have to guess. Picking single stocks is closer to gambling unless you're prepared to research deeply and accept big swings.";
    }
    if (has("crypto", "bitcoin", "ethereum", "btc", "nft", "altcoin")) {
      return "Crypto is highly volatile and speculative - it can swing 50%+ in weeks. The common-sense rule from most advisors: never put in more than you can afford to lose entirely, and treat it as a small slice (under 5-10%) of an otherwise diversified portfolio. Build your emergency fund and index-fund base first; crypto is the spice, not the meal.";
    }

    // ===== TAX =====
    if (has("tax", "taxes", "deduction", "irs", "write off", "refund")) {
      return "The biggest legal way to cut taxes is using tax-advantaged accounts: 401k and traditional IRA contributions lower your taxable income today, while a Roth grows tax-free for later. Beyond that: track deductible expenses if you're self-employed, hold investments over a year for lower capital-gains rates, and never turn down a raise over tax fears - you only ever pay the higher rate on the dollars above each bracket, never your whole income.";
    }

    // ===== CREDIT SCORE =====
    if (has("credit score", "credit report", "fico", "improve credit", "build credit", "credit rating")) {
      return "Five things drive your credit score: (1) payment history - never miss a due date, set autopay, (2) utilization - keep balances under 30% of your limit, ideally under 10%, (3) age of accounts - don't close old cards, (4) credit mix, (5) new inquiries - don't open many at once. The fastest wins are always paying on time and paying down card balances.";
    }

    // ===== STUDENT LOANS vs INVEST =====
    if (has("student loan", "loans or invest", "pay off or invest", "payoff or invest")) {
      return "Compare the interest rate to expected investment returns. If your student loan is above ~6-7%, paying it off is a guaranteed return that's hard to beat - prioritize it. If it's low (say under 5%), you can make minimums and invest the rest, since the market has historically returned ~8-10% long term. Either way: grab any 401k employer match first - that's an instant 100% return nothing else matches.";
    }

    // ===== KIDS & MONEY =====
    if (has("kids", "children", "teach my", "child about money", "allowance")) {
      return "Teaching kids money: (1) give them a small allowance they manage themselves - real decisions teach faster than lectures, (2) use three jars: spend, save, give, (3) let them feel the sting of running out, (4) match their savings to demonstrate compound growth, (5) be open about your own money choices. The Richest Man in Babylon and Rich Dad Poor Dad are both about lessons passed down - model the behavior you want.";
    }

    // ===== NET WORTH BY AGE / AM I BEHIND =====
    if (has("net worth", "behind", "my age", "for my age", "should i have saved", "no savings")) {
      return "A common benchmark (from The Millionaire Next Door): expected net worth = age x pretax income / 10. So at 30 earning $50k, roughly $150k. But don't panic if you're behind - the variable that matters most is your savings RATE going forward, not where you are today. Someone starting at 25 with $0 who saves 20% will out-finish someone who started richer but saves nothing. Start now; time is the asset.";
    }

    // ===== IMPULSE BUYING =====
    if (has("impulse", "stop spending", "overspend", "tempt", "shopping habit", "buying things")) {
      return "Beating impulse spending: (1) the 24-hour rule - wait a day on anything non-essential over $50; most urges pass, (2) delete saved cards from shopping apps so buying takes effort, (3) unsubscribe from store emails and unfollow brands, (4) ask 'is this a need or a want?' out loud, (5) give every dollar a job in your budget so there's no 'free' money to splurge. Friction is your friend.";
    }

    // ===== VACATION / SAVING FOR A GOAL =====
    if (has("vacation", "save for", "saving for", "trip", "wedding", "buy a", "big purchase", "sinking fund")) {
      return "Save for a specific goal with a 'sinking fund': decide the total and the deadline, then divide. Want $3,000 for a trip in 10 months? That's $300/month - automate it into a separate savings account so it's untouchable. Seeing a dedicated balance grow is far more motivating than a vague 'general savings,' and it keeps the splurge guilt-free because you planned for it.";
    }

    // ===== RAISE / EXTRA MONEY / SURPLUS / WHAT TO DO WITH MONEY =====
    if (has("got a raise", "just got a raise", "pay raise", "promotion", "more money now")) {
      return "Congrats! The wealth-building move is to avoid lifestyle inflation - the #1 trap from The Millionaire Next Door. Bank at least half of every raise before you adjust your spending. If your raise is $500/month, send $250+ straight to savings or investing automatically. You were living fine before; let the gap become wealth instead of a bigger apartment.";
    }
    if (has("extra money", "extra cash", "surplus", "leftover", "what should i do with", "what to do with", "spare money", "found money", "bonus")) {
      var order = "When you have extra money, follow this proven order:\n\n1. High-interest debt (credit cards above ~15%) - pay it off, it's a guaranteed return.\n2. Emergency fund - 3 to 6 months of expenses in a high-yield savings account.\n3. Employer 401k match - free money, never leave it.\n4. Invest the rest - max a Roth IRA, then low-cost index funds.";
      if (surplus > 0) order += "\n\nYou're running a surplus of about " + dollars(surplus) + " - that's exactly the fuel for these steps.";
      return order;
    }

    // ===== SAVINGS RATE HEALTH =====
    if (has("savings rate", "saving rate", "am i saving enough", "doing well", "doing good", "healthy", "good rate", "on track", "how am i doing")) {
      if (savings >= 30) return "Your savings rate of " + savings + "% is outstanding - elite territory. The FIRE movement targets 40%+, but above 30% you're building wealth fast. The key now: make sure that surplus is invested, not sitting in cash losing value to inflation.";
      if (savings >= 20) return "A " + savings + "% savings rate is excellent - beating the 20% standard from the 50/30/20 rule. Morgan Housel argues your savings rate matters more than your investment returns early on, so you're doing the most important thing right. Next: put that surplus to work in index funds.";
      if (savings >= 10) return "At " + savings + "% you're ahead of most people, but there's room to hit 20%. Look at " + (topCat && topCat.val > 0 ? topCat.name + " (" + dollars(topCat.val) + ", your biggest expense)" : "your largest category") + " and try trimming 10-15%.";
      if (savings > 0) return "You're saving " + savings + "%, which is positive - good start. The target is 20%. Your fastest lever is your biggest expense: " + (topCat && topCat.val > 0 ? topCat.name + " at " + dollars(topCat.val) : "your top category") + ". Cutting it by a fifth would move your rate noticeably.";
      return "Right now you're spending everything you earn or more. The Richest Man in Babylon's first rule: pay yourself first - keep at least 10% before any spending. Automate a small payday transfer to savings, then attack your largest expense.";
    }

    // ===== SAVE MORE =====
    if (has("save more", "how to save", "how do i save", "save money", "spend less", "cut spending", "reduce spending", "cut back", "lower my expenses")) {
      return "Three high-impact moves to save more:\n\n1. Attack your biggest category - " + (topCat && topCat.val > 0 ? topCat.name + " is your largest at " + dollars(topCat.val) + ". A 20% cut saves " + dollars(topCat.val * 0.2) + "/period." : "find your top expense and trim it first.") + "\n\n2. Automate it - auto-transfer to savings on payday so you pay yourself first. You can't spend what you don't see.\n\n3. The 24-hour rule - wait a day before any non-essential buy over $50. Most impulse purchases evaporate.";
    }

    // ===== IRREGULAR INCOME =====
    if (has("irregular income", "freelance", "self employed", "variable income", "commission", "gig", "uneven income", "1099")) {
      return "Budgeting on irregular income: (1) figure out your bare-minimum monthly need - that's your baseline, (2) in good months, don't spend the surplus - park it in a buffer account, (3) pay yourself a steady 'salary' from that buffer so lean months feel normal, (4) save aggressively when work is flush. Set aside ~25-30% of each payment for taxes since they're not withheld. The buffer is everything.";
    }

    // ===== BUDGET / 50-30-20 =====
    if (has("budget", "50/30/20", "50 30 20", "allocate", "how much should i spend", "spending plan")) {
      if (income > 0) return "The 50/30/20 rule on your " + dollars(income) + " income:\n\n- Needs (rent, food, utilities): " + dollars(Math.round(income * 0.5)) + "\n- Wants (dining, fun): " + dollars(Math.round(income * 0.3)) + "\n- Savings and debt: " + dollars(Math.round(income * 0.2)) + "\n\nYou're spending " + dollars(expense) + " total now. Check the Budgets tab to spot categories over their limit - that's where to focus.";
      return "The 50/30/20 framework: 50% of income to needs, 30% to wants, 20% to savings and debt. Ramit Sethi's twist: spend lavishly on the few things you love, cut hard everywhere else. Add income data and I'll give you exact dollar targets.";
    }

    // ===== EMERGENCY FUND =====
    if (has("emergency", "rainy day", "safety net", "cushion", "lose my job", "job loss")) {
      var ef = monthlySpend > 0 ? monthlySpend : 1000;
      return "An emergency fund is your foundation - Dave Ramsey and Ramit Sethi both say build it before investing. Target 3-6 months of expenses. Based on your spending of " + dollars(monthlySpend) + ", aim for " + dollars(ef * 3) + " to " + dollars(ef * 6) + ". Keep it in a high-yield savings account: liquid, separate, earning a little interest.";
    }

    // ===== INVEST (general - after specific account/stock/crypto checks) =====
    if (has("invest", "index fund", "etf", "portfolio", "stock market", "grow my money", "where to put money")) {
      var base = "Investing basics from people who've done it:\n\n1. Buffett's pick for most people: a low-cost S&P 500 index fund - it beats ~90% of active managers over 10 years.\n2. Order of operations: employer 401k match first (free money), then Roth IRA, then taxable brokerage.\n3. Time in the market beats timing the market - start now, stay consistent, don't panic-sell.";
      if (surplus > 0) base += "\n\nYou have ~" + dollars(surplus) + " surplus - that's the fuel, once your emergency fund is set.";
      return base;
    }

    // ===== DEBT =====
    if (has("debt", "loan", "credit card", "owe", "pay off", "in the red", "minimum payment")) {
      return "Two proven debt strategies:\n\n- Avalanche (saves most money): pay minimums on all, attack the highest-interest debt first.\n- Snowball (Dave Ramsey, best for motivation): pay the smallest balance first for quick wins and momentum.\n\nNon-negotiable: clear any credit card debt above ~15% interest before investing - no investment reliably beats that guaranteed return from killing the interest.";
    }

    // ===== HOUSE =====
    if (has("house", "home", "mortgage", "down payment", "property", "real estate")) {
      return "Buying a home: aim for 20% down to avoid PMI, and keep total housing under 28% of gross income (the classic lender rule). Kiyosaki's caution: your primary home is a liability until it earns income - house hacking (renting a room or unit) flips that. Save the down payment in a separate high-yield account so it doesn't mix with daily money.";
    }

    // ===== RENT VS BUY =====
    if (has("rent or buy", "rent vs buy", "renting or buying", "should i rent")) {
      return "Rent vs buy isn't just about 'throwing money away' on rent. Buying makes sense if you'll stay 5+ years (transaction costs are huge), you have 20% down plus an emergency fund, and the mortgage fits under 28% of income. Renting wins if you value flexibility, the local price-to-rent ratio is high, or you'd be stretched thin. Run the numbers for YOUR city - in many markets renting and investing the difference beats owning.";
    }

    // ===== CAR =====
    if (has("car", "vehicle", "auto loan", "lease", "truck")) {
      var carNote = "The Millionaire Next Door found most millionaires drive used cars bought with cash. A new car loses 20%+ of value the moment you drive off the lot. Rule of thumb: buy used, pay cash if you can, keep total car costs (payment, insurance, gas) under 15% of take-home. A lease is usually the most expensive option long-term.";
      var m = q.match(/\$?\s*([0-9][0-9,]{3,})/);
      if (m) {
        var price = parseFloat(m[1].replace(/,/g, ""));
        var maxCar = income * 12 * 0.35;
        carNote += "\n\nOn a $" + price.toLocaleString() + " car: a common ceiling is ~35% of annual income on a vehicle. At your income that's about " + dollars(maxCar) + ", so " + (price <= maxCar ? "it's within a reasonable range - just favor used and avoid a long loan." : "that's on the high side - consider a cheaper or used option to protect your savings rate.");
      }
      return carNote;
    }

    // ===== RETIREMENT / FIRE =====
    if (has("retire", "fire", "financial independence", "pension", "how much to retire", "retirement")) {
      var annual = monthlySpend * 12;
      var fireNum = annual > 0 ? annual * 25 : 0;
      var msg = "Financial independence runs on the 4% rule: you can safely withdraw 4% of your portfolio yearly, so your target number is ~25x annual expenses.";
      if (fireNum > 0) msg += " At your current spending that's roughly " + dollars(fireNum) + ". A common savings guideline is 15% of income for a normal retirement; higher gets you there sooner - save 50% and you could retire in ~17 years regardless of income.";
      return msg;
    }

    // ===== INCOME / SIDE HUSTLE / NEGOTIATE =====
    if (has("make more money", "earn more", "side hustle", "side income", "second job", "increase income", "negotiate", "ask for a raise", "higher salary")) {
      return "Naval Ravikant's core idea: you won't get rich renting out your time - build or earn equity in something that scales. Practical moves: (1) negotiate your salary, the highest-ROI hour you'll ever spend - even a 10% bump compounds for your whole career, (2) build 'specific knowledge' that's hard to train, (3) start a side income that can grow without your hours. Cutting costs has a floor; earning has no ceiling.";
    }

    // ===== INFLATION =====
    if (has("inflation", "cost of living", "prices going up", "money worth less")) {
      return "Inflation quietly erodes cash sitting idle - that's why the wealthy hold appreciating assets, not stacks of cash. Keep only your emergency fund in cash (in a high-yield account that partly keeps pace), and invest the rest so your money grows faster than prices rise. Historically, stocks have been one of the best long-term inflation hedges.";
    }

    // ===== FINANCIAL ADVISOR =====
    if (has("financial advisor", "should i hire", "wealth manager", "planner", "professional help")) {
      return "Most people don't need to pay for one early on - the basics (spend less than you earn, kill high-interest debt, index funds, max tax-advantaged accounts) you can do yourself. If you do hire one, choose a fee-only fiduciary (legally bound to act in your interest) and avoid anyone earning commissions on what they sell you. Fees compound against you: 1% a year can cost six figures over a lifetime.";
    }

    // ===== BUDGETING APP / TOOLS =====
    if (has("budgeting app", "best app", "tool", "track spending", "software")) {
      return "You're using one right now - track every transaction here and check your Budgets tab. The best tool is the one you'll actually use consistently. The principle behind all of them is the same: awareness changes behavior. Just seeing where your money goes each week is often enough to naturally cut waste.";
    }

    // ===== RICH MINDSET =====
    if (has("rich", "wealthy", "wealth", "millionaire", "billionaire", "get rich", "stay rich", "money mindset")) {
      return "The uncomfortable truth from The Millionaire Next Door: most millionaires look ordinary - modest homes, used cars, no flash. Morgan Housel: wealth is what you DON'T see, the purchases never made. The formula isn't complex: earn, keep a wide gap between income and spending, invest that gap consistently, and let compounding work for decades. Get-rich-quick is usually how people get poor quick.";
    }

    // ===== HOW MUCH / AFFORD (generic, after specific car/house) =====
    if (has("how much", "afford", "can i buy", "too expensive")) {
      return "General affordability guardrails: housing under 28% of income, total debt payments under 36%, save 20%+. On your " + dollars(income) + " income, keep essentials around " + dollars(Math.round(income * 0.5)) + " and protect at least " + dollars(Math.round(income * 0.2)) + " for savings. Tell me the specific purchase and I'll think it through with you.";
    }

    // ===== TIP =====
    if (has("tip", "gratuity", "how much to tip")) {
      return "Standard US tipping: 18-20% at sit-down restaurants, 15-20% for rideshares and delivery, $1-2 per drink at a bar, 15-20% for haircuts. Budgeting tip: if you dine out often, factor tips into your Food/Entertainment budget - at 20%, they add up faster than people expect.";
    }

    // ===== MOTIVATION / DISCIPLINE / STICKING TO BUDGET =====
    if (has("stick to", "discipline", "motivat", "give up", "keep failing", "cant stop", "willpower", "hard to", "struggle")) {
      return "Discipline beats willpower - so remove the need for it. Automate savings so it happens before you can spend. Think and Grow Rich stresses a definite goal with a deadline; vague intentions fail. Pick one concrete target - save " + dollars(Math.round((income || 1000) * 0.2)) + " this month - automate it, and let the system carry you instead of relying on motivation.";
    }

    // ===== INTELLIGENT GENERAL ENGINE (handles anything) =====
    // Detect question type and sentiment to compose a real reply.
    var isQuestion = q.indexOf("?") !== -1 || has("what", "how", "why", "when", "where", "who", "which", "should i", "can i", "is it", "are ", "do i", "does ", "will ", "would ", "could ");
    var isYesNo = has("should i", "can i", "is it worth", "is it good", "is it bad", "do you think", "would you", "is this");

    // --- Emotional / venting ---
    if (has("stressed", "anxious", "worried", "scared", "overwhelmed", "depressed", "broke", "poor", "struggling financially", "cant afford", "can't afford", "paycheck to paycheck", "no money")) {
      return "I hear you - money stress is heavy, and you're not alone in it. Let's make it smaller and concrete. First, list your absolute essentials (housing, food, utilities, minimum debt payments). Everything above that is where we find breathing room. Even setting aside $10 builds the habit and the sense of control. What's the one bill or expense weighing on you most right now? We'll start there.";
    }
    if (has("hate budgeting", "boring", "too hard", "confusing", "dont understand", "don't understand", "lost", "complicated")) {
      return "Totally fair - most budgeting advice is needlessly complicated. Here's the whole thing in one line: spend less than you earn, and put the difference somewhere it grows. That's it. Start by just tracking what you spend for one week here - no judgment, no rules. Awareness alone changes behavior. Want me to set up a dead-simple plan for you?";
    }
    if (has("good job", "proud", "i did it", "i saved", "paid off", "reached my goal", "hit my goal")) {
      return "That's genuinely worth celebrating - well done. Progress like this compounds, both in your balance and your confidence. The key now is to lock in the habit: keep the same routine going so this becomes your normal, not a one-time win. What's the next goal you want to aim at?";
    }

    // --- Opinion / yes-no questions get a real stance ---
    if (isYesNo) {
      if (has("worth it", "good idea", "smart")) {
        return "It depends on the trade-off, so here's how I'd decide it: does this purchase or choice move you toward your goals or away from them? A useful test from Ramit Sethi - spend freely on the few things you genuinely love, and cut hard on everything else. If this is one of your few true priorities and it fits your budget without touching savings or debt payments, it's likely worth it. If it's a passing want, sleep on it 24 hours. Tell me the specifics and I'll give you a sharper read.";
      }
    }

    // --- General money/life questions: give a thoughtful, useful answer ---
    if (has("subscription", "subscriptions", "recurring", "cancel")) {
      return "Subscriptions are the silent budget killer - they're designed to be forgotten. Do a quarterly audit: list every recurring charge, then for each ask 'have I used this in the last month?' Cancel anything that's a no. People commonly find $50-100/month of forgotten subscriptions. That's $600-1,200 a year back in your pocket.";
    }
    if (has("grocery", "groceries", "food cost", "eating out", "restaurant", "takeout", "meal")) {
      return "Food is usually the most controllable big expense. Practical wins: plan meals before shopping and stick to a list, cook in batches, and treat eating out as a planned treat rather than a default. Cutting restaurant spending is often the single fastest way to boost your savings rate without feeling deprived - cooking the same meal at home typically costs a quarter of the restaurant price.";
    }
    if (has("salary", "paid", "wage", "income", "make a year", "earn a year")) {
      return "Whatever you earn, the rule that builds wealth is the same: the gap between income and spending is what matters, not the income alone. Plenty of high earners are broke and plenty of modest earners retire rich - it comes down to the savings rate. That said, raising income has no ceiling, so negotiating your pay and building valuable skills is worth real effort. Want tips on negotiating a raise?";
    }
    if (has("bank", "savings account", "checking", "high yield", "hysa", "interest rate")) {
      return "Keep your money in the right buckets: a checking account for monthly spending, and a high-yield savings account (HYSA) for your emergency fund and short-term goals. A HYSA pays meaningfully more interest than a regular savings account for the exact same safety - there's no reason to leave your emergency fund earning nothing. For money you won't need for 5+ years, investing beats any savings account.";
    }
    if (has("insurance", "insure", "premium", "deductible")) {
      return "Insurance is about protecting against catastrophe, not small stuff. Carry what protects you from financial ruin (health, auto liability, renters/home, and term life if people depend on you), and skip the gimmicky add-ons. Raising your deductible lowers your premium - worth it if you have an emergency fund to cover that deductible. Review premiums yearly and get competing quotes; loyalty rarely pays.";
    }
    if (has("loan", "borrow", "finance", "interest")) {
      return "Before borrowing, separate good debt from bad. Debt that buys an appreciating asset or boosts income (a reasonable mortgage, sometimes education) can make sense. Debt for consumption - cars beyond your means, vacations, gadgets on a credit card - quietly drains wealth. If you must borrow, get the lowest rate you can, read the terms, and have a clear payoff plan before you sign.";
    }

    // --- Non-finance / off-topic: stay in character, redirect warmly ---
    if (!isQuestion && q.split(" ").length <= 3) {
      // Short ambiguous input - ask for clarity rather than dumping a summary
      return "Tell me a bit more and I'll help. You can ask me anything about your money - saving, spending, budgeting, investing, debt, big purchases, or just 'where should I start?' What's on your mind, " + (props.username ? props.username : "friend") + "?";
    }
    if (has("weather", "sports", "movie", "music", "game", "joke", "love", "relationship", "cook", "recipe")) {
      return "Ha - I'm Richard, your finance guy, so that's a bit outside my lane. But I'm great with anything money-related: saving, investing, budgets, debt, big purchases, retirement. What can I help you sort out financially?";
    }

    // --- Genuine attempt at any remaining question ---
    if (isQuestion) {
      var lead = "Good question. ";
      var body = "Here's how I'd think about it through a money lens: every financial decision comes down to whether it widens or narrows the gap between what you earn and what you spend. ";
      var personal = "";
      if (income > 0 || expense > 0) {
        personal = "For context, you're at " + dollars(income) + " income and " + dollars(expense) + " spent (" + savings + "% saved). ";
      }
      var close = "If you give me the specifics - the amount, the goal, or the choice you're weighing - I can run the actual numbers with you. What are you trying to decide?";
      return lead + body + personal + close;
    }

    // --- Final catch-all: warm, useful, never robotic ---
    var parts = [];
    parts.push("I want to make sure I help with the right thing.");
    if (income > 0 || expense > 0) parts.push("Right now you're at " + dollars(income) + " in, " + dollars(expense) + " out, saving " + savings + "%.");
    parts.push("Ask me anything - how to save more, build a budget, invest, tackle debt, plan a big purchase, or just 'where do I start?' I've got you.");
    return parts.join(" ");
  }

  function getAdvice() {
    setLoading(true); setAdvice(null); setErrMsg("");
    var system = "You are an elite personal finance advisor trained on the wisdom of the world's greatest wealth builders. You have deep knowledge from:\n\nBOOKS & AUTHORS:\n- The Psychology of Money (Morgan Housel): wealth is about behavior not intelligence; saving is about the gap between ego and income; reasonable beats rational\n- Rich Dad Poor Dad (Robert Kiyosaki): assets put money in pocket, liabilities take it out; buy assets first, luxuries last; make money work for you\n- The Millionaire Next Door (Stanley & Danko): most millionaires live below their means, drive used cars, avoid lifestyle inflation\n- I Will Teach You To Be Rich (Ramit Sethi): automate savings, negotiate bills, spend extravagantly on things you love but cut mercilessly elsewhere\n- The Total Money Makeover (Dave Ramsey): debt snowball, emergency fund first, live on less than you earn\n- Think and Grow Rich (Napoleon Hill): definiteness of purpose, the mastermind principle, persistence\n- The Richest Man in Babylon (George Clason): pay yourself first 10%, let savings work, live on 70%, give 20% to debts\n- Money Master the Game (Tony Robbins): asset allocation drives 90% of returns, fees kill wealth, asymmetric risk/reward\n\nINTERVIEWS & QUOTES FROM THE WEALTHY:\n- Warren Buffett: do not save what is left after spending, spend what is left after saving; rule 1 never lose money, rule 2 never forget rule 1; someone is sitting in the shade today because someone planted a tree long ago\n- Charlie Munger: invert always invert; avoid what destroys wealth as much as seeking what builds it; the best thing a human being can do is to help another human being know more\n- Ray Dalio: diversify well and you can reduce risk without reducing returns; pain plus reflection equals progress; he who lives by the crystal ball will eat shattered glass\n- Naval Ravikant: earn with your mind not your time; specific knowledge cannot be taught; build or buy equity in a business\n- Warren Buffett on compounding: the snowball: compound interest is the eighth wonder of the world\n- Mark Cuban: pay off credit cards every month, never carry a balance; savings rates matter more than investment returns early on\n- Grant Cardone: the middle class saves to retire, the wealthy invest to create income now; 40% of income saved minimum\n- Jeff Bezos: focus on what will not change, not what will; think in long time horizons\n- Elon Musk: take as much risk as you can afford, you only live once\n\nPROVEN STRATEGIES:\n- Pay yourself first: automate 10-20% savings before touching income\n- The latte factor: small daily expenses compound into large annual costs\n- 50/30/20 rule: 50% needs, 30% wants, 20% savings and debt\n- Emergency fund: 3-6 months of expenses in liquid savings before investing\n- No lifestyle inflation: when income rises, raise savings rate not spending\n- Avoid car payments: buy used cars with cash or low financing\n- Cook more, eat out less: food is typically the fastest growing expense\n- Cancel subscriptions quarterly: audit recurring charges every 3 months\n- Negotiate everything: bills, salary, rent, insurance premiums\n- Tax efficiency: maximize retirement accounts before taxable investing\n- Index funds beat active management 90% of the time over 10 years\n- The 4% rule: you can withdraw 4% annually from a portfolio indefinitely\n- House hacking: rent part of your home to cover the mortgage\n- The one-day rule: wait 24 hours before any purchase over $50\n\nReturn ONLY valid JSON, no markdown. Never use emojis or non-ASCII symbols anywhere in any field. Use this structure: {\"score\":72,\"scoreLabel\":\"Good\",\"headline\":\"Summary here.\",\"insights\":[{\"type\":\"strength\",\"title\":\"Title\",\"body\":\"Body.\"},{\"type\":\"warning\",\"title\":\"Title\",\"body\":\"Body.\"},{\"type\":\"tip\",\"title\":\"Title\",\"body\":\"Body.\"}],\"expertQuote\":{\"quote\":\"Quote.\",\"author\":\"Author\"},\"webInsight\":{\"title\":\"Title\",\"body\":\"Body.\"}}";
    callClaude([{ role: "user", content: "Analyze these finances and give personalized advice: " + ctx }], system, 900, function(err, text) {
      setLoading(false);
      if (err) {
        // API unreachable in this environment - use built-in analysis
        setAdvice(localAnalysis());
        return;
      }
      try {
        var cleaned = text;
        var start = text.indexOf("{");
        var end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          cleaned = text.slice(start, end + 1);
        }
        setAdvice(JSON.parse(cleaned));
      } catch(e) {
        // Response not parseable - use built-in analysis
        setAdvice(localAnalysis());
      }
    });
  }

  function suggestAction(response) {
    var actionLower = response.toLowerCase();
    // Detect if Richard suggested a specific action and offer to implement it
    if (actionLower.indexOf("automate") !== -1 && actionLower.indexOf("savings") !== -1) {
      return { type: "reminder", label: "Set up automatic savings transfer", icon: "spark" };
    }
    if (actionLower.indexOf("roth ira") !== -1 || actionLower.indexOf("401k") !== -1) {
      return { type: "link", label: "Open a Roth IRA or 401k", icon: "spark" };
    }
    if ((actionLower.indexOf("budget") !== -1 || actionLower.indexOf("allocate") !== -1) && actionLower.indexOf("50/30/20") !== -1) {
      return { type: "action", label: "Apply 50/30/20 to my budgets", icon: "budget", fn: "apply5030 20" };
    }
    if (actionLower.indexOf("emergency fund") !== -1 && actionLower.indexOf("$") !== -1) {
      return { type: "action", label: "Create an emergency fund goal", icon: "flag" };
    }
    if (actionLower.indexOf("cut") !== -1 && actionLower.indexOf("20%") !== -1) {
      return { type: "action", label: "Reduce top category by 20%", icon: "spark" };
    }
    if (actionLower.indexOf("24-hour rule") !== -1 || actionLower.indexOf("impulse") !== -1) {
      return { type: "reminder", label: "Set a reminder for the 24-hour rule", icon: "spark" };
    }
    return null;
  }

  function sendChat() {
    if (!input.trim() || chatLoading) return;
    var msg = input.trim();
    setInput("");
    var nc = chat.concat([{ role: "user", text: msg }]);
    setChat(nc);
    setChatLoading(true);
    callClaude(
      nc.map(function(m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; }),
      "You are Richard, a smart assistant inside the Richy personal finance app. You are calm, warm, direct, and knowledgeable - a trusted friend who is an expert in money and can help with anything the user asks. You have deep knowledge from The Psychology of Money, Rich Dad Poor Dad, The Millionaire Next Door, I Will Teach You To Be Rich, The Total Money Makeover, Think and Grow Rich, The Richest Man in Babylon, and wisdom from Warren Buffett, Charlie Munger, Ray Dalio, Naval Ravikant, Mark Cuban, Grant Cardone and other wealth builders. You can answer questions about personal finance, investments, budgeting, debt, taxes, and wealth-building. You can also answer questions about how to use the Richy app (it has tabs: Overview, Activity for transactions, Budgets for spending limits, Goals for savings targets, and Advisor which is where we are now; categories are managed via the tag icon on Overview or the Manage link in pickers). You can answer general knowledge and technical questions too - if someone asks about math, technology, or anything else, answer helpfully. Always refer back to the user's real financial data when relevant. Current user financial data: " + ctx + ". Be concise and direct. Plain text only. Never use markdown formatting: no asterisks, no hash headers, no bullet symbols. Never use emojis or any non-text symbols under any circumstance." + (props.lang && props.lang !== "en" ? " Respond entirely in " + (LANGUAGE_NAMES[props.lang] || "English") + "." : ""),
      500,
      function(err, text) {
        setChatLoading(false);
        var response = err || !text ? Richard(msg) : text;
        setChat(function(p) { return p.concat([{ role: "assistant", text: response }]); });
        // Check if Richard's response suggests an action
        var action = suggestAction(response);
        if (action && Math.random() > 0.7) {
          setPendingAction(action);
        }
      }
    );
  }

  var scoreColor = advice && !advice.error ? (advice.score >= 80 ? T.green : advice.score >= 60 ? T.orange : T.red) : T.orange;
  var iStyle = { strength: { bg: "rgba(52,199,89,0.1)", dot: T.green }, warning: { bg: "rgba(255,59,48,0.1)", dot: T.red }, tip: { bg: T.orangeDim, dot: T.orange } };

  return (
    <div>
      {!advice && !loading && (
        <Card style={{ padding: "28px 22px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>$</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{tr("aiAdvisor")}</div>
          <div style={{ fontSize: 14, color: T.ink2, lineHeight: 1.55, marginBottom: 22 }}>
            {tr("aiAdvisorSub")}
          </div>
          {errMsg && (
            <div style={{ fontSize: 12, color: T.red, background: "rgba(255,59,48,0.08)", borderRadius: 10, padding: "8px 12px", marginBottom: 14, textAlign: "left" }}>
              {errMsg}
            </div>
          )}
          <button onClick={getAdvice}
            style={{ background: T.orange, color: "#fff", border: "none", borderRadius: 16, padding: "16px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: "pointer", width: "100%", boxShadow: "0 4px 14px rgba(217,121,65,0.4)" }}>
            {tr("analyzeMyFinances")}
          </button>
        </Card>
      )}

      {loading && (
        <Card style={{ padding: "44px 22px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.ink2 }}>{tr("analyzingFinances")}</div>
          <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>{tr("fewSeconds")}</div>
        </Card>
      )}

      {advice && !advice.error && (
        <div>
          <Card style={{ padding: "20px", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <RingChart value={advice.score} max={100} size={68} color={scoreColor} stroke={6} />
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: scoreColor }}>
                  {advice.score}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor, textTransform: "uppercase", letterSpacing: "0.07em" }}>{advice.scoreLabel}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, lineHeight: 1.35, marginTop: 3 }}>{advice.headline}</div>
              </div>
            </div>
            <button onClick={function() { setAdvice(null); getAdvice(); }}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "1px solid " + T.sep, borderRadius: 10, padding: "7px 12px", marginTop: 14, cursor: "pointer", color: T.ink2, fontSize: 13 }}>
              {tr("refresh")}
            </button>
          </Card>

          <div style={{ padding: "0 4px 10px" }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{tr("insights")}</span>
          </div>
          {(advice.insights || []).map(function(ins, i) {
            var st = iStyle[ins.type] || iStyle.tip;
            return (
              <Card key={i} style={{ padding: "14px 16px", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.dot, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ background: st.bg, borderRadius: 10, padding: "10px 14px", flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 4 }}>{ins.title}</div>
                    <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>{ins.body}</div>
                  </div>
                </div>
              </Card>
            );
          })}

          {advice.expertQuote && (
            <Card style={{ padding: "18px 20px", marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontStyle: "italic", color: T.ink, lineHeight: 1.6, marginBottom: 8 }}>"{advice.expertQuote.quote}"</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase" }}>- {advice.expertQuote.author}</div>
            </Card>
          )}
        </div>
      )}

      {advice && advice.error && (
        <Card style={{ padding: "24px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: T.red, marginBottom: 6 }}>{tr("analysisFailed")}</div>
          {errMsg && <div style={{ fontSize: 12, color: T.ink3, marginBottom: 14, background: "rgba(0,0,0,0.04)", borderRadius: 8, padding: "8px 12px", textAlign: "left" }}>{errMsg}</div>}
          <button onClick={function() { setAdvice(null); setErrMsg(""); }}
            style={{ background: T.orange, color: "#fff", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            {tr("tryAgain")}
          </button>
        </Card>
      )}

      <div style={{ padding: "0 4px 10px" }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: T.ink }}>{tr("askYourAdvisor")}</span>
      </div>
      <Card style={{ overflow: "hidden", marginBottom: 24 }}>
        {chat.length === 0 && (
          <div style={{ padding: "14px 16px 6px" }}>
            {[tr("advisorQ1"), tr("advisorQ2"), tr("advisorQ3")].map(function(q) {
              return (
                <button key={q} onClick={function() { setInput(q); }}
                  style={{ display: "block", width: "100%", textAlign: "left", background: "rgba(0,0,0,0.03)", border: "1px solid " + T.sep, borderRadius: 12, padding: "10px 14px", marginBottom: 8, fontSize: 14, color: T.ink2, fontFamily: UI, cursor: "pointer" }}>
                  {q}
                </button>
              );
            })}
          </div>
        )}
        {chat.length > 0 && (
          <div style={{ maxHeight: 280, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {chat.map(function(m, i) {
              return (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ maxWidth: "82%", borderRadius: 16, padding: "10px 14px", background: m.role === "user" ? T.orange : "rgba(0,0,0,0.05)", color: m.role === "user" ? "#fff" : T.ink, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            {chatLoading && (
              <div style={{ padding: "10px 14px", background: "rgba(0,0,0,0.05)", borderRadius: 16, width: "fit-content", fontSize: 14, color: T.ink3 }}>
                {tr("thinking")}
              </div>
            )}
          </div>
        )}
        {pendingAction && (
          <div style={{ padding: "12px 12px 4px", borderTop: "0.5px solid " + T.sep, background: T.orangeDim, marginTop: 10, borderRadius: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.orange, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 18 }}>*</span>
              {tr("richySuggests")}: {pendingAction.label}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={function() {
                if (pendingAction.type === "action") {
                  if (pendingAction.fn === "apply50/30/20") {
                    var pool = (income || 3000) * 0.8;
                    var weights = { Housing: 0.34, Food: 0.18, Transport: 0.12, Health: 0.06, Entertainment: 0.12, Shopping: 0.10, Travel: 0.04, Other: 0.04 };
                    var newB = cats.map(function(c) {
                      var w = weights[c.name];
                      if (!w) return null;
                      return { catId: c.id, category: c.name, limit: Math.round(pool * w) };
                    }).filter(Boolean);
                    if (newB.length) props.onSaveBudgets(newB);
                    setChat(function(p) { return p.concat([{ role: "assistant", text: "Done. I've set budgets across your categories along the 50/30/20 lines. Open Budgets to fine-tune." }]); });
                  } else if (pendingAction.label.indexOf("emergency fund") !== -1) {
                    var efTarget = Math.round((expense || 1000) * 3);
                    props.onSaveGoals(props.goals.concat([{ id: Date.now(), name: "Emergency Fund", target: efTarget, saved: 0 }]));
                    setChat(function(p) { return p.concat([{ role: "assistant", text: "Goal created: Emergency Fund of " + dollars(efTarget) + ". Start small and build it up." }]); });
                  } else if (pendingAction.label.indexOf("20%") !== -1) {
                    var topC = cats.map(function(c) { return { c: c, val: catSpend(c) }; }).sort(function(a, b) { return b.val - a.val; })[0];
                    if (topC && topC.val > 0) {
                      var newLimit = Math.round(topC.val * 0.8);
                      var exists = false;
                      var updated = props.budgets.map(function(b) { if (b.catId === topC.c.id) { exists = true; return { catId: b.catId, category: b.category, limit: newLimit }; } return b; });
                      if (!exists) updated = updated.concat([{ catId: topC.c.id, category: topC.c.name, limit: newLimit }]);
                      props.onSaveBudgets(updated);
                      setChat(function(p) { return p.concat([{ role: "assistant", text: "Done. I've set your " + topC.c.name + " budget to " + dollars(newLimit) + ", a 20% trim. You've got this." }]); });
                    }
                  }
                }
                setPendingAction(null);
              }}
                style={{ flex: 1, background: T.orange, color: "#fff", border: "none", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {tr("yesDo")}
              </button>
              <button onClick={function() { setPendingAction(null); }}
                style={{ flex: 1, background: "rgba(0,0,0,0.1)", color: T.ink2, border: "none", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {tr("notNow")}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: chat.length > 0 ? "0.5px solid " + T.sep : "none" }}>
          <input value={input} onChange={function(e) { setInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter" && !chatLoading) sendChat(); }}
            placeholder={tr("askRichard")}
            style={{ flex: 1, border: "none", background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "10px 14px", fontSize: 14, fontFamily: UI, outline: "none", color: T.ink }} />
          <button onClick={sendChat} disabled={!input.trim() || chatLoading}
            style={{ background: input.trim() && !chatLoading ? T.orange : "rgba(0,0,0,0.1)", border: "none", borderRadius: 12, width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 18 }}>
            ^
          </button>
        </div>
      </Card>
      <div style={{ textAlign: "center", fontSize: 11, color: T.ink3, lineHeight: 1.55, padding: "0 10px 6px", letterSpacing: "0.01em" }}>
        {tr("advisorDisclaimer")}
      </div>
    </div>
  );
}

function IconGrid(props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 9 }}>
      {ICON_BANK.map(function(ic) {
        var on = ic === props.value;
        return (
          <button key={ic} onClick={function() { props.onChange(ic); }}
            style={{ width: 44, height: 44, borderRadius: 13, cursor: "pointer",
              background: on ? props.color + "22" : "rgba(0,0,0,0.04)",
              border: on ? "2px solid " + props.color : "2px solid transparent",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SVGIcon id={ic} size={22} color={on ? props.color : T.ink2} />
          </button>
        );
      })}
    </div>
  );
}

function ColorGrid(props) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 9 }}>
      {COLOR_BANK.map(function(col) {
        var on = col === props.value;
        return (
          <button key={col} onClick={function() { props.onChange(col); }}
            style={{ width: 30, height: 30, borderRadius: "50%", background: col, cursor: "pointer",
              border: on ? "3px solid rgba(0,0,0,0.28)" : "3px solid transparent",
              boxShadow: on ? "0 2px 8px " + col + "77" : "none" }} />
        );
      })}
    </div>
  );
}

function CategoryForm(props) {
  var init = props.initial;
  var _n = useState(init.name || "");
  var nm = _n[0]; var setNm = _n[1];
  var _i = useState(init.icon || ICON_BANK[0]);
  var ic = _i[0]; var setIc = _i[1];
  var _c = useState(init.color || COLOR_BANK[0]);
  var col = _c[0]; var setCol = _c[1];
  var _fd = useState(init.folderId || (props.folders[0] || {}).id || "");
  var fid = _fd[0]; var setFid = _fd[1];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <CatBadge icon={ic} color={col} size={64} />
      </div>
      <FormRow label="Name" value={nm} onChange={function(e) { setNm(e.target.value); }} />
      <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "12px 15px", marginBottom: 9 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 9 }}>Icon</div>
        <IconGrid value={ic} color={col} onChange={setIc} />
      </div>
      <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "12px 15px", marginBottom: 9 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 9 }}>Color</div>
        <ColorGrid value={col} onChange={setCol} />
      </div>
      {props.folders.length > 0 && (
        <FolderSelectRow value={fid} folders={props.folders} onChange={setFid} />
      )}
      <BigBtn label={props.submitLabel} disabled={!nm.trim()} onPress={function() {
        props.onSubmit({ name: nm.trim(), icon: ic, color: col, folderId: fid });
      }} />
      {props.onDelete && (
        <button onClick={props.onDelete}
          style={{ width: "100%", background: "none", border: "none", color: T.red, fontSize: 14, fontWeight: 600, fontFamily: UI, cursor: "pointer", marginTop: 12, padding: "6px 0" }}>
          Delete category
        </button>
      )}
    </div>
  );
}

function FolderSelectRow(props) {
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: "12px 15px", marginBottom: 9 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>Folder</div>
      <select value={props.value} onChange={function(e) { props.onChange(e.target.value); }}
        style={{ width: "100%", border: "none", background: "none", fontSize: 16, color: T.ink, fontFamily: UI, outline: "none", padding: 0 }}>
        {props.folders.map(function(f) { return <option key={f.id} value={f.id}>{f.name}</option>; })}
      </select>
    </div>
  );
}

function Categories(props) {
  var cats = props.categories || [];
  var folders = props.folders || [];
  var _nf = useState(false);
  var newFolder = _nf[0]; var setNewFolder = _nf[1];
  var _fn = useState("");
  var folderName = _fn[0]; var setFolderName = _fn[1];
  var _ec = useState(null);
  var editCat = _ec[0]; var setEditCat = _ec[1];

  function txCount(c) {
    return props.tx.filter(function(t) { return t.catId === c.id || t.category === c.name; }).length;
  }

  // Group categories by folder, preserving folder order, with a trailing "Unfiled".
  var groups = folders.map(function(f) {
    return { folder: f, items: cats.filter(function(c) { return c.folderId === f.id; }) };
  });
  var unfiled = cats.filter(function(c) { return !folders.some(function(f) { return f.id === c.folderId; }); });
  if (unfiled.length) groups.push({ folder: { id: "_unfiled", name: "Unfiled" }, items: unfiled });

  return (
    <div>
      <Overlay open={props.sheetOpen} onClose={function() { props.setSheetOpen(false); }} title="New Category">
        <CategoryForm initial={{}} folders={folders} submitLabel="Create Category"
          onSubmit={function(data) {
            props.onSaveCategories(cats.concat([{ id: "c" + Date.now(), name: data.name, icon: data.icon, color: data.color, folderId: data.folderId }]));
            props.setSheetOpen(false);
          }} />
      </Overlay>

      <Overlay open={!!editCat} onClose={function() { setEditCat(null); }} title="Edit Category">
        {editCat && (
          <CategoryForm initial={editCat} folders={folders} submitLabel="Save Changes"
            onSubmit={function(data) {
              props.onSaveCategories(cats.map(function(c) { return c.id === editCat.id ? { id: c.id, name: data.name, icon: data.icon, color: data.color, folderId: data.folderId } : c; }));
              setEditCat(null);
            }}
            onDelete={function() {
              props.onSaveCategories(cats.filter(function(c) { return c.id !== editCat.id; }));
              setEditCat(null);
            }} />
        )}
      </Overlay>

      <Overlay open={newFolder} onClose={function() { setNewFolder(false); setFolderName(""); }} title="New Folder">
        <FormRow label="Folder name" value={folderName} onChange={function(e) { setFolderName(e.target.value); }} last={true} />
        <BigBtn label="Create Folder" disabled={!folderName.trim()} onPress={function() {
          props.onSaveFolders(folders.concat([{ id: "f" + Date.now(), name: folderName.trim() }]));
          setFolderName("");
          setNewFolder(false);
        }} />
      </Overlay>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 12px" }}>
        <span style={{ fontSize: 14, color: T.ink3 }}>{cats.length} categories in {folders.length} folders</span>
        <button onClick={function() { setNewFolder(true); }}
          style={{ display: "flex", alignItems: "center", gap: 5, background: T.orangeDim, border: "none", borderRadius: 20, padding: "7px 13px", cursor: "pointer", color: T.orange, fontSize: 13, fontWeight: 700, fontFamily: UI }}>
          <SVGIcon id="folder" size={14} color={T.orange} /> New Folder
        </button>
      </div>

      {groups.map(function(grp) {
        return (
          <div key={grp.folder.id} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 6px 8px" }}>
              <SVGIcon id="folder" size={15} color={T.ink3} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: "0.08em" }}>{grp.folder.name}</span>
              <span style={{ fontSize: 12, color: T.ink3 }}>{grp.items.length}</span>
            </div>
            {grp.items.length === 0 ? (
              <Card style={{ padding: "16px 18px" }}>
                <span style={{ fontSize: 13, color: T.ink3 }}>No categories here yet.</span>
              </Card>
            ) : (
              <Card style={{ overflow: "hidden" }}>
                {grp.items.map(function(c, i) {
                  return (
                    <button key={c.id} onClick={function() { setEditCat(c); }}
                      style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 16px", width: "100%", background: "none", border: "none", borderBottom: i < grp.items.length - 1 ? "0.5px solid " + T.sep : "none", cursor: "pointer", textAlign: "left", fontFamily: UI }}>
                      <CatBadge icon={c.icon} color={c.color} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, color: T.ink, fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: T.ink3, marginTop: 1 }}>{txCount(c)} {txCount(c) === 1 ? "transaction" : "transactions"}</div>
                      </div>
                      <SVGIcon id="chevron" size={16} color={T.ink3} />
                    </button>
                  );
                })}
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SubViewBack(props) {
  return (
    <button onClick={props.onBack}
      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.orange, fontSize: 14, fontWeight: 600, fontFamily: UI, marginBottom: 20 }}>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={T.orange} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
      {props.label || "Profile"}
    </button>
  );
}

function NicknameView(props) {
  var _v = useState(props.value || "");
  var val = _v[0]; var setVal = _v[1];
  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <Card style={{ padding: "22px 20px", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: T.ink3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>{tr("richyRefersTo")}</div>
        <input
          value={val}
          onChange={function(e) { setVal(e.target.value); }}
          style={{ width: "100%", fontSize: 24, fontWeight: 700, color: T.ink, background: "none", border: "none", outline: "none", fontFamily: UI, padding: 0, boxSizing: "border-box" }}
          autoFocus={true}
        />
      </Card>
      <BigBtn label={tr("save")} onPress={function() { if (val.trim()) { props.onSave(val.trim()); } }} disabled={!val.trim()} />
    </div>
  );
}

function LanguageView(props) {
  var _sel = useState(props.lang || "en");
  var selected = _sel[0]; var setSelected = _sel[1];
  function pick(code) { setSelected(code); props.onLangChange(code); }
  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        {LANGUAGE_OPTIONS.map(function(opt, i) {
          var sel = selected === opt.code;
          return (
            <button key={opt.code} onClick={function() { pick(opt.code); }}
              style={{ width: "100%", background: sel ? "rgba(200,103,58,0.05)" : "none", border: "none", borderBottom: i < LANGUAGE_OPTIONS.length - 1 ? "0.5px solid " + T.sep : "none", padding: "17px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: UI }}>
              <span style={{ fontSize: 16, fontWeight: sel ? 700 : 500, color: sel ? T.ink : T.ink2 }}>{opt.label}</span>
              {sel && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SVGIcon id="check" size={12} color="#fff" />
                </div>
              )}
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function CurrencyView(props) {
  var cur = props.currency || "$";
  return (
    <div>
      <SubViewBack onBack={props.onBack} />
      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        {CURRENCY_OPTIONS.map(function(opt, i) {
          var sel = cur === opt.sym;
          return (
            <button key={opt.sym} onClick={function() { props.onCurrencyChange(opt.sym); }}
              style={{ width: "100%", background: sel ? "rgba(200,103,58,0.05)" : "none", border: "none", borderBottom: i < CURRENCY_OPTIONS.length - 1 ? "0.5px solid " + T.sep : "none", padding: "17px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: UI }}>
              <span style={{ fontSize: 16, fontWeight: sel ? 700 : 500, color: sel ? T.ink : T.ink2 }}>{opt.label}</span>
              {sel && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: T.orange, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SVGIcon id="check" size={12} color="#fff" />
                </div>
              )}
            </button>
          );
        })}
      </Card>
    </div>
  );
}

function PlanView(props) {
  var _msgs = useState([]); var msgs = _msgs[0]; var setMsgs = _msgs[1];
  var _inp = useState(""); var input = _inp[0]; var setInput = _inp[1];
  var _load = useState(false); var loading = _load[0]; var setLoading = _load[1];
  var _pa = useState(null); var pendingAction = _pa[0]; var setPendingAction = _pa[1];
  var _tp = useState(false); var translatingPlan = _tp[0]; var setTranslatingPlan = _tp[1];

  function planNeedsTranslation() {
    if (!props.plan || !props.lang || props.lang === "en") return false;
    for (var i = 0; i < props.plan.length; i++) {
      if (props.plan.charCodeAt(i) > 127) return false;
    }
    return true;
  }

  function translatePlan() {
    if (translatingPlan || !props.plan || !props.lang || props.lang === "en") return;
    var langName = LANGUAGE_NAMES[props.lang] || props.lang;
    setTranslatingPlan(true);
    callClaude(
      [{ role: "user", content: "Translate this financial plan to " + langName + ". Keep the same warm tone, structure, and personal advice. Output only the translated plan, nothing else:\n\n" + props.plan }],
      "You are Richard, a personal finance advisor. Translate the given financial plan faithfully to the requested language. Preserve the warm, direct, personal tone.",
      400,
      function(err, translated) { setTranslatingPlan(false); if (!err && translated && props.onUpdatePlan) props.onUpdatePlan(translated); }
    );
  }

  useEffect(function() {
    if (planNeedsTranslation()) translatePlan();
  }, []);

  function parseAction(text) {
    var m = text.match(/\[ACTION:\{([^}]*)\}\]/);
    if (!m) return null;
    try { return JSON.parse("{" + m[1] + "}"); } catch(e) { return null; }
  }

  function cleanText(text) {
    return text.replace(/\[ACTION:\{[^}]*\}\]/g, "").trim();
  }

  function sendMessage() {
    if (!input.trim() || loading) return;
    var userMsg = input.trim();
    setInput("");
    var newMsgs = msgs.concat([{ role: "user", text: userMsg }]);
    setMsgs(newMsgs);
    setLoading(true);
    var apiMsgs = newMsgs.map(function(m) {
      return { role: m.role === "user" ? "user" : "assistant", content: m.text };
    });
    var sys = "You are Richard, a warm and knowledgeable personal finance advisor inside the Richy app. "
      + "The user's name is " + (props.username || "there") + ". "
      + "Their current financial plan is: " + (props.plan || "not yet created") + ". "
      + "The user is giving you feedback and asking questions about their plan. "
      + "Reply concisely, under 100 words. No markdown. No bullet lists. "
      + "If you want to suggest a specific concrete change, append exactly one action tag at the very end: "
      + "[ACTION:{\"type\":\"budget\",\"category\":\"Food\",\"limit\":500}] to set a budget, or "
      + "[ACTION:{\"type\":\"goal\",\"name\":\"Emergency Fund\",\"target\":3000}] to create a goal. "
      + "Only include an action tag when making a specific recommendation with real numbers.";
    callClaude(apiMsgs, sys, 250, function(err, reply) {
      var text = err || !reply ? "Sorry, I could not connect. Try again." : reply;
      var action = parseAction(text);
      var clean = cleanText(text);
      setMsgs(function(prev) { return prev.concat([{ role: "richard", text: clean }]); });
      if (action) setPendingAction(action);
      setLoading(false);
    });
  }

  function implementAction() {
    if (!pendingAction) return;
    if (pendingAction.type === "budget") {
      var catName = (pendingAction.category || "").toLowerCase();
      var cat = (props.categories || []).filter(function(c) { return c.name.toLowerCase() === catName; })[0];
      if (cat && props.onSaveBudgets) {
        var rest = (props.budgets || []).filter(function(b) { return b.catId !== cat.id; });
        props.onSaveBudgets(rest.concat([{ catId: cat.id, limit: pendingAction.limit || 0 }]));
      }
    } else if (pendingAction.type === "goal") {
      if (props.onSaveGoals) {
        var ng = { id: Date.now(), name: pendingAction.name || "New Goal", target: pendingAction.target || 1000, saved: 0 };
        props.onSaveGoals((props.goals || []).concat([ng]));
      }
    }
    setPendingAction(null);
  }

  return (
    <div>
      <SubViewBack onBack={props.onBack} />

      {props.plan ? (
        <Card style={{ padding: "22px 22px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: UI }}>
              {tr("yourPlanByRichard")}
            </div>
            {props.lang && props.lang !== "en" && (
              <button onClick={translatePlan}
                style={{ fontSize: 11, color: T.orange, background: "none", border: "none", cursor: "pointer", fontFamily: UI, fontWeight: 600, padding: 0, opacity: translatingPlan ? 0.5 : 1 }}>
                {translatingPlan ? "..." : tr("translate")}
              </button>
            )}
          </div>
          <div style={{ fontSize: 15, color: T.ink, lineHeight: 1.7, fontFamily: UI }}>
            {props.plan}
          </div>
        </Card>
      ) : (
        <Card style={{ padding: "36px 22px", textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 15, color: T.ink3, lineHeight: 1.6 }}>{tr("noPlanYet")}</div>
        </Card>
      )}

      {msgs.length > 0 && (
        <Card style={{ padding: "16px 18px", marginBottom: 16 }}>
          {msgs.map(function(m, i) {
            var isUser = m.role === "user";
            return (
              <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: i < msgs.length - 1 ? 10 : 0 }}>
                <div style={{ maxWidth: "82%", background: isUser ? T.orange : "rgba(0,0,0,0.05)", borderRadius: 14, padding: "9px 13px", fontSize: 14, color: isUser ? "#fff" : T.ink, lineHeight: 1.5, fontFamily: UI }}>
                  {m.text}
                </div>
              </div>
            );
          })}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 10 }}>
              <div style={{ background: "rgba(0,0,0,0.05)", borderRadius: 14, padding: "9px 13px", fontSize: 14, color: T.ink3, fontFamily: UI }}>...</div>
            </div>
          )}
        </Card>
      )}

      {pendingAction && (
        <Card style={{ padding: "18px 18px", marginBottom: 16, border: "1.5px solid " + T.orange }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.orange, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: UI }}>
            {tr("richySuggests")}
          </div>
          <div style={{ fontSize: 14, color: T.ink, marginBottom: 14, fontFamily: UI, lineHeight: 1.5 }}>
            {pendingAction.type === "budget"
              ? "Set a " + dollars(pendingAction.limit || 0) + " budget for " + (pendingAction.category || "")
              : "Create goal: " + (pendingAction.name || "") + " (" + dollars(pendingAction.target || 0) + ")"}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={implementAction}
              style={{ flex: 1, background: T.orange, color: "#fff", border: "none", borderRadius: 10, padding: "9px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: UI }}>
              {tr("implement")}
            </button>
            <button onClick={function() { setPendingAction(null); }}
              style={{ flex: 1, background: "rgba(0,0,0,0.08)", color: T.ink2, border: "none", borderRadius: 10, padding: "9px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: UI }}>
              {tr("dismiss")}
            </button>
          </div>
        </Card>
      )}

      <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, padding: "10px 12px" }}>
          <input value={input} onChange={function(e) { setInput(e.target.value); }}
            onKeyDown={function(e) { if (e.key === "Enter" && !loading) sendMessage(); }}
            placeholder={tr("giveFeedback")}
            style={{ flex: 1, border: "none", background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "10px 14px", fontSize: 14, fontFamily: UI, outline: "none", color: T.ink }} />
          <button onClick={sendMessage} disabled={!input.trim() || loading}
            style={{ background: input.trim() && !loading ? T.orange : "rgba(0,0,0,0.1)", border: "none", borderRadius: 12, width: 40, height: 40, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 18 }}>
            ^
          </button>
        </div>
      </Card>

      <button onClick={props.onRetake}
        style={{ width: "100%", background: T.orangeDim, color: T.orange, border: "1.5px solid rgba(200,103,58,0.2)", borderRadius: 16, padding: "16px 0", fontSize: 16, fontFamily: UI, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
        {tr("redoQuestionnaire")}
      </button>
    </div>
  );
}

function ProfileRow(props) {
  var curLabel = props.value ? (
    <span style={{ fontSize: 13, color: T.ink3, fontFamily: UI }}>{props.value}</span>
  ) : null;
  return (
    <button onClick={props.onClick}
      style={{ width: "100%", background: "none", border: "none", borderBottom: props.last ? "none" : "0.5px solid " + T.sep, padding: "17px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", fontFamily: UI }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: props.iconBg || T.orangeDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <SVGIcon id={props.icon} size={17} color={props.iconColor || T.orange} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{props.label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {curLabel}
        <SVGIcon id="chevron" size={16} color={T.ink3} />
      </div>
    </button>
  );
}

function Profile(props) {
  var cur = props.currency || "$";
  var lang = props.lang || "en";
  var langLabel = (LANGUAGE_OPTIONS.filter(function(o) { return o.code === lang; })[0] || {}).label || "English";
  var curLabel = (CURRENCY_OPTIONS.filter(function(o) { return o.sym === cur; })[0] || {}).label || cur;
  return (
    <div>
      <Card style={{ padding: "28px 22px", marginBottom: 16, textAlign: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: T.orange, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", boxShadow: "0 4px 16px rgba(217,121,65,0.4)", fontSize: 32, color: "#fff" }}>
          @
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: T.ink }}>{props.user}</div>
        <div style={{ fontSize: 13, color: T.ink3, marginTop: 4 }}>{tr("richyMember")}</div>
      </Card>

      <Card style={{ overflow: "hidden", marginBottom: 16 }}>
        <ProfileRow icon="spark" label={tr("seeYourPlan")} onClick={props.onViewPlan} />
        <ProfileRow icon="person" label={tr("richyRefersTo")} value={props.user} onClick={props.onViewNickname} />
        <ProfileRow icon="coins" label={tr("currency")} value={curLabel} onClick={props.onViewCurrency} />
        <ProfileRow icon="book" label={tr("language")} value={langLabel} onClick={props.onViewLanguage} last={true} />
      </Card>

      <button onClick={props.onLogout}
        style={{ width: "100%", background: "rgba(255,59,48,0.08)", color: T.red, border: "none", borderRadius: 16, padding: "16px 0", fontSize: 17, fontFamily: UI, fontWeight: 700, cursor: "pointer" }}>
        {tr("signOut")}
      </button>
    </div>
  );
}

var TABS = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "budgets", label: "Budgets" },
  { id: "goals", label: "Goals" },
  { id: "advisor", label: "Advisor" },
];

var HAS_FAB = ["activity", "goals", "budgets", "categories", "notes"];

export default function App() {
  var _user = useState(null);
  var user = _user[0]; var setUser = _user[1];
  var _tab = useState("overview");
  var tab = _tab[0]; var setTab = _tab[1];
  var _tx = useState([]);
  var tx = _tx[0]; var setTx = _tx[1];
  var _bud = useState([]);
  var budgets = _bud[0]; var setBudgets = _bud[1];
  var _gls = useState([]);
  var goals = _gls[0]; var setGoals = _gls[1];
  var _nts = useState([]);
  var notes = _nts[0]; var setNotes = _nts[1];
  var _fld = useState([]);
  var folders = _fld[0]; var setFolders = _fld[1];
  var _cat = useState([]);
  var categories = _cat[0]; var setCategories = _cat[1];
  var _sh = useState(false);
  var sheet = _sh[0]; var setSheet = _sh[1];
  var _cur = useState("$");
  var currency = _cur[0]; var setCurrency = _cur[1];
  var _ak = useState(null);
  var accountKey = _ak[0]; var setAccountKey = _ak[1];
  var _od = useState(false);
  var onboardingDone = _od[0]; var setOnboardingDone = _od[1];
  var _rp = useState("");
  var richPlan = _rp[0]; var setRichPlan = _rp[1];
  var _ud = useState("");
  var userDob = _ud[0]; var setUserDob = _ud[1];
  var _pjc = useState(false);
  var planJustCreated = _pjc[0]; var setPlanJustCreated = _pjc[1];
  var _lg = useState("en");
  var lang = _lg[0]; var setLang = _lg[1];
  var _ack = useState(false);
  var authChecked = _ack[0]; var setAuthChecked = _ack[1];
  // In-memory mirror of the signed-in user's full Firestore document, so writes
  // can merge against it without an async read-before-write each time.
  var blobRef = useRef({});

  function loadData(data) {
    setTx(data.tx || []);
    setBudgets(data.budgets || []);
    setGoals(data.goals || []);
    setNotes(data.notes || []);
    setFolders((data.folders && data.folders.length) ? data.folders : freshFolders());
    setCategories((data.categories && data.categories.length) ? data.categories : freshCategories());
    var sym = data.currency || "$";
    setCurrency(sym);
    _currency.sym = sym;
    setOnboardingDone(data.onboardingDone === true);
    setRichPlan(data.plan || "");
    setUserDob(data.dob || "");
    _lang.code = data.lang || "en"; setLang(data.lang || "en");
  }

  useEffect(function() {
    if (tab !== "overview") setPlanJustCreated(false);
  }, [tab]);

  // Build the starting document for a brand-new account (e.g. first Google sign-in).
  function defaultBlob(name, email) {
    return { tx: [], budgets: [], goals: [], notes: [], folders: freshFolders(), categories: freshCategories(), displayName: name, email: email };
  }

  // Firebase Auth is the single source of truth for the session. It restores the
  // signed-in user on reload and fires whenever they sign in or out.
  useEffect(function() {
    if (!cloudReady()) { setAuthChecked(true); return function () {}; }
    var unsub = CLOUD.onAuth(function(fbUser) {
      setAuthChecked(true);
      if (!fbUser) { return; }                 // signed out -> AuthScreen shows
      if (window.__cbSignup) { return; }       // email signup creates the doc itself
      CLOUD.loadUser(fbUser.uid).then(function(data) {
        if (!data) {
          var nm = fbUser.displayName || (fbUser.email ? fbUser.email.split("@")[0] : "there");
          data = defaultBlob(nm, fbUser.email || "");
          CLOUD.saveUser(fbUser.uid, data);
        }
        blobRef.current = data;
        loadData(data);
        setUser(data.displayName || fbUser.email || "there");
        setAccountKey(fbUser.uid);
      }).catch(function() {});
    });
    return function() { if (typeof unsub === "function") unsub(); };
  }, []);

  function handleLogin(displayName, data, key) {
    blobRef.current = data || {};
    loadData(data || {});
    setUser(displayName);
    setAccountKey(key || displayName);
  }

  function handleLogout() {
    CLOUD.signOut();
    blobRef.current = {};
    setUser(null); setAccountKey(null); setTab("overview");
    setTx([]); setBudgets([]); setGoals([]); setNotes([]); setFolders([]); setCategories([]);
    _lang.code = "en"; setOnboardingDone(false); setRichPlan(""); setUserDob(""); setPlanJustCreated(false); setLang("en");
  }

  function save(next) {
    if (!accountKey) return;
    var existing = blobRef.current || {};
    var blob = {};
    for (var ek in existing) blob[ek] = existing[ek];
    blob.tx = tx; blob.budgets = budgets; blob.goals = goals; blob.notes = notes; blob.folders = folders; blob.categories = categories; blob.currency = currency; blob.lang = lang;
    for (var k in next) blob[k] = next[k];
    blobRef.current = blob;
    CLOUD.saveUser(accountKey, blob);
  }

  function onSaveTx(next) { setTx(next); save({ tx: next }); }
  function onSaveBudgets(next) { setBudgets(next); save({ budgets: next }); }
  function onSaveGoals(next) { setGoals(next); save({ goals: next }); }
  function onSaveNotes(next) { setNotes(next); save({ notes: next }); }
  function onSettleNote(nextTx, nextNotes) { setTx(nextTx); setNotes(nextNotes); save({ tx: nextTx, notes: nextNotes }); }

  // Reminder scheduling. Timers don't survive reload, so we re-derive them from
  // each note's durable `reminder.due` whenever notes change, firing any that are
  // already overdue (a catch-up when the app reopens). Marking a reminder fired
  // persists notes only (reading the freshest blob) so it can't clobber other
  // arrays that may have changed since this render.
  var notesRef = useRef(notes);
  notesRef.current = notes;
  function persistNotesOnly(nextNotes) {
    setNotes(nextNotes);
    if (!accountKey) return;
    var existing = blobRef.current || {};
    var blob = {};
    for (var k in existing) blob[k] = existing[k];
    blob.notes = nextNotes;
    blobRef.current = blob;
    CLOUD.saveUser(accountKey, blob);
  }
  // Fire one or more due reminders and mark them all fired in a SINGLE state
  // update, computed from the freshest notes. Doing all due notes in one pass
  // avoids the stale-ref clobber (and duplicate fire) that per-note updates cause
  // when several reminders come due at once (e.g. a catch-up after the app reopens).
  function fireDue(ids) {
    var want = {};
    for (var a = 0; a < ids.length; a++) { want[ids[a]] = true; }
    var cur = notesRef.current;
    var fired = false;
    var next = cur.map(function(n) {
      if (want[n.id] && n.reminder && !n.reminder.fired) {
        fireReminder(n);
        fired = true;
        var nn = {}; for (var k in n) nn[k] = n[k];
        nn.reminder = { due: n.reminder.due, fired: true };
        return nn;
      }
      return n;
    });
    if (fired) { persistNotesOnly(next); }
  }
  var remTimers = useRef({});
  useEffect(function() {
    for (var old in remTimers.current) { clearTimeout(remTimers.current[old]); }
    remTimers.current = {};
    var now = Date.now();
    var dueNow = [];
    notes.forEach(function(n) {
      if (!n.reminder || n.reminder.fired) return;
      var delay = n.reminder.due - now;
      if (delay <= 0) { dueNow.push(n.id); return; }
      if (delay < 2147483647) {
        (function(id) {
          remTimers.current[id] = setTimeout(function() { fireDue([id]); }, delay);
        })(n.id);
      }
    });
    if (dueNow.length) { fireDue(dueNow); }
    return function() { for (var k in remTimers.current) { clearTimeout(remTimers.current[k]); } };
  }, [notes]);

  function onSaveFolders(next) { setFolders(next); save({ folders: next }); }
  function onSaveCategories(next) { setCategories(next); save({ categories: next }); }
  function onSaveCurrency(sym) { _currency.sym = sym; setCurrency(sym); save({ currency: sym }); }
  function onSaveLang(code) {
    _lang.code = code;
    setLang(code);
    save({ lang: code });
    if (richPlan) {
      var langName = (LANGUAGE_OPTIONS.filter(function(o) { return o.code === code; })[0] || {}).label || code;
      callClaude(
        [{ role: "user", content: "Translate this financial plan to " + langName + ". Keep the same warm tone, structure, and personal advice. Output only the translated plan, nothing else:\n\n" + richPlan }],
        "You are Richard, a personal finance advisor. Translate the given financial plan faithfully to the requested language. Preserve the warm, direct, personal tone.",
        400,
        function(err, translated) { if (!err && translated) { setRichPlan(translated); save({ plan: translated }); } }
      );
    }
  }
  function onSaveNickname(name) { setUser(name); save({ displayName: name }); }

  function handleOnboardingComplete(plan, oData, suggestedBudgets) {
    setRichPlan(plan);
    setOnboardingDone(true);
    setPlanJustCreated(true);
    var current = blobRef.current || {};
    var merged = {};
    for (var k in current) merged[k] = current[k];
    merged.onboardingDone = true;
    merged.plan = plan;
    merged.onboardingData = oData;
    if (suggestedBudgets && suggestedBudgets.length) {
      setBudgets(suggestedBudgets);
      merged.budgets = suggestedBudgets;
    }
    blobRef.current = merged;
    CLOUD.saveUser(accountKey, merged);
  }

  if (cloudReady() && !authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#FDF5EC 0%,#FAF0E4 40%,#F5E8D8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: UI }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(145deg," + T.orangeHi + "," + T.orange + ")", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 32px " + T.orangeGlow }}>
          <SVGIcon id="spark" size={30} color="#fff" />
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  if (!onboardingDone) {
    return <OnboardingScreen username={user} dob={userDob} lang={lang} onComplete={handleOnboardingComplete} />;
  }

  function handleRetakePlan() {
    setOnboardingDone(false);
    setPlanJustCreated(false);
    var current = blobRef.current || {};
    var merged = {};
    for (var k in current) merged[k] = current[k];
    merged.onboardingDone = false;
    blobRef.current = merged;
    CLOUD.saveUser(accountKey, merged);
  }

  var currentTab = tab;
  var _localeMap = { en: "en-US", he: "he-IL", es: "es-ES", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU", de: "de-DE", pt: "pt-BR" };
  var _locale = _localeMap[lang] || "en-US";
  var monthLabel = new Date().toLocaleString(_locale, { month: "short" }) + " " + new Date().getFullYear();

  return (
    <div style={{ background: T.bg, minHeight: "100vh", maxWidth: 430, margin: "0 auto", fontFamily: UI, paddingBottom: 100 }}>

      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(250,247,242,0.92)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 20px 0", alignItems: "center" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: T.ink }}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <RichyLogo size={26} style={{ display: "block", borderRadius: 7, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }} />
          <button onClick={function() { setTab("profile"); }} style={{ background: "none", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: tab === "profile" ? T.orange : "rgba(0,0,0,0.06)" }}>
            <SVGIcon id="user" size={16} color={tab === "profile" ? "#fff" : T.ink2} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", padding: "10px 20px 14px" }}>
          <div style={{ width: 80, display: "flex", alignItems: "center" }}>
            <div style={{ background: T.orangeDim, borderRadius: 40, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: T.orange, letterSpacing: "0.01em" }}>{monthLabel}</div>
          </div>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 700, color: T.ink, textAlign: "center", letterSpacing: "-0.02em" }}>
            {tr(currentTab === "plan" ? "yourPlan" : currentTab === "nickname" ? "name" : currentTab === "notes" ? "notes" : currentTab)}
          </span>
          <div style={{ width: 80, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          {HAS_FAB.indexOf(currentTab) !== -1 ? (
            <button onClick={function() { setSheet(function(v) { return !v; }); }}
              style={{ background: sheet ? T.ink : "linear-gradient(135deg," + T.orangeHi + "," + T.orange + ")", border: "none", borderRadius: 40, width: 36, height: 36, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: sheet ? "none" : "0 4px 12px " + T.orangeGlow, transition: "all 0.2s" }}>
              <SVGIcon id={sheet ? "plus" : "plus"} size={16} color="#fff" />
            </button>
          ) : (
            <div style={{ width: 36 }} />
          )}
          </div>
        </div>
      </div>

      <div style={{ padding: "8px 16px 0" }}>
        {currentTab === "overview" && <Overview tx={tx} goals={goals} budgets={budgets} categories={categories} username={user} plan={planJustCreated ? richPlan : ""} onCategories={function() { setTab("categories"); setSheet(false); }} />}
        {currentTab === "activity" && <Activity tx={tx} categories={categories} onSaveTx={onSaveTx} sheetOpen={sheet} setSheetOpen={setSheet} onManageCategories={function() { setTab("categories"); setSheet(false); }} onOpenNotes={function() { setTab("notes"); setSheet(false); }} />}
        {currentTab === "notes" && <Notes notes={notes} tx={tx} categories={categories} onSaveNotes={onSaveNotes} onSaveTx={onSaveTx} onSettleNote={onSettleNote} sheetOpen={sheet} setSheetOpen={setSheet} onBack={function() { setTab("activity"); setSheet(false); }} onManageCategories={function() { setTab("categories"); setSheet(false); }} />}
        {currentTab === "budgets" && <Budgets tx={tx} budgets={budgets} categories={categories} onSaveBudgets={onSaveBudgets} sheetOpen={sheet} setSheetOpen={setSheet} onManageCategories={function() { setTab("categories"); setSheet(false); }} />}
        {currentTab === "goals" && <Goals goals={goals} onSaveGoals={onSaveGoals} sheetOpen={sheet} setSheetOpen={setSheet} />}
        {currentTab === "categories" && <Categories tx={tx} categories={categories} folders={folders} onSaveCategories={onSaveCategories} onSaveFolders={onSaveFolders} sheetOpen={sheet} setSheetOpen={setSheet} />}
        {currentTab === "advisor" && <Advisor tx={tx} budgets={budgets} goals={goals} categories={categories} username={user} plan={richPlan} lang={lang} />}
        {currentTab === "profile" && <Profile user={user} onLogout={handleLogout} currency={currency} lang={lang} onViewPlan={function() { setTab("plan"); }} onViewCurrency={function() { setTab("currency"); }} onViewLanguage={function() { setTab("language"); }} onViewNickname={function() { setTab("nickname"); }} />}
        {currentTab === "plan" && <PlanView plan={richPlan} onBack={function() { setTab("profile"); }} onRetake={handleRetakePlan} username={user} lang={lang} categories={categories} budgets={budgets} goals={goals} onSaveBudgets={onSaveBudgets} onSaveGoals={onSaveGoals} onUpdatePlan={function(t) { setRichPlan(t); save({ plan: t }); }} />}
        {currentTab === "language" && <LanguageView lang={lang} onLangChange={onSaveLang} onBack={function() { setTab("profile"); }} />}
        {currentTab === "currency" && <CurrencyView currency={currency} onCurrencyChange={onSaveCurrency} onBack={function() { setTab("profile"); }} />}
        {currentTab === "nickname" && <NicknameView value={user} onSave={function(name) { onSaveNickname(name); setTab("profile"); }} onBack={function() { setTab("profile"); }} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 30, background: "rgba(250,246,240,0.95)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", borderTop: "0.5px solid rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-around", padding: "8px 0 28px" }}>
          {TABS.map(function(tab) {
            var active = currentTab === tab.id;
            return (
              <button key={tab.id} onClick={function() { setTab(tab.id); setSheet(false); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 4px", flex: 1, minWidth: 0 }}>
                <div style={{ background: active ? T.ink : "none", borderRadius: 14, padding: active ? "6px 11px" : "6px 9px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", boxShadow: active ? "0 2px 8px rgba(0,0,0,0.18)" : "none" }}>
                  <SVGIcon id={tab.id} size={21} color={active ? "#fff" : T.ink3} />
                </div>
                <span style={{ fontSize: 9.5, fontWeight: active ? 700 : 400, color: active ? T.orange : T.ink3, letterSpacing: "0.005em", whiteSpace: "nowrap" }}>
                  {tr(tab.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
