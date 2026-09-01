// ============================================================
// FIREBASE-INIT.JS
// ============================================================
// Este arquivo é o "motor" que fala com o banco de dados.
// Você não precisa mexer neste arquivo — ele já vem pronto.
// Cada uma das suas 4 páginas de cálculo vai importar as funções
// daqui para: (1) exigir login, (2) salvar um acerto, (3) listar
// os acertos já salvos.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --------------------------------------------------------------
// checkConnection()
// Só testa se a configuração está preenchida corretamente.
// Usado na página inicial para mostrar a bolinha verde/vermelha.
// --------------------------------------------------------------
export async function checkConnection() {
  return firebaseConfig.apiKey && firebaseConfig.apiKey !== "COLE_AQUI";
}

// --------------------------------------------------------------
// login(email, senha)
// Faz login. Use uma conta que você mesmo cria no painel do
// Firebase (passo 5 do README.md) — não é a sua conta do Google.
// --------------------------------------------------------------
export function login(email, senha) {
  return signInWithEmailAndPassword(auth, email, senha);
}

export function logout() {
  return signOut(auth);
}

// --------------------------------------------------------------
// exigirLogin(callback)
// Coloque isso no topo de cada página de cálculo. Se ninguém
// estiver logado, ela redireciona para a tela de login.
// Se estiver logado, executa o callback com o usuário.
// --------------------------------------------------------------
export function exigirLogin(callback) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../login.html";
    } else {
      callback(user);
    }
  });
}

// --------------------------------------------------------------
// salvarAcerto(tipo, dados)
// tipo: uma string fixa identificando o módulo, por exemplo:
//   "brigadista" | "comissionado_sem_vinculo" |
//   "comissionado_com_vinculo" | "efetivo"
// dados: um objeto JS comum com os campos do cálculo
//   (ex: { matricula, nome, competencia, valores: {...} })
//
// Retorna o ID do documento salvo.
// --------------------------------------------------------------
export async function salvarAcerto(tipo, dados) {
  const ref = await addDoc(collection(db, "acertos"), {
    tipo,
    dados,
    criadoEm: serverTimestamp(),
    criadoPor: auth.currentUser ? auth.currentUser.email : "desconhecido"
  });
  return ref.id;
}

// --------------------------------------------------------------
// listarAcertos(tipo)
// Devolve todos os acertos salvos de um tipo específico,
// mais recentes primeiro.
// --------------------------------------------------------------
export async function listarAcertos(tipo) {
  const q = query(
    collection(db, "acertos"),
    where("tipo", "==", tipo),
    orderBy("criadoEm", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function listarTodos() { 
  const q = query(collection(db, "acertos"), orderBy("criadoEm", "desc")); 
  const snap = await getDocs(q); 
  return snap.docs.map(d => ({ id: d.id, ...d.data() })); 
}
// --------------------------------------------------------------
// registrarAcessoSite(user) — uso interno
// Grava um registro na coleção "acessos" na primeira vez que a
// pessoa abre o portal numa sessão de navegação (aba). Usa
// sessionStorage — que persiste entre páginas na mesma aba, mas
// é apagado ao fechar a aba/navegador — para NÃO gerar um
// registro novo a cada módulo visitado, só na "entrada" no site.
// --------------------------------------------------------------
const CHAVE_SESSAO_ACESSO = "portal_acesso_registrado";

function jaRegistrouNestaSessao() {
  try {
    return sessionStorage.getItem(CHAVE_SESSAO_ACESSO) === "1";
  } catch (e) {
    return false;
  }
}

function marcarSessaoComoRegistrada() {
  try {
    sessionStorage.setItem(CHAVE_SESSAO_ACESSO, "1");
  } catch (e) {
    // Se o navegador bloquear sessionStorage (modo privado restrito, etc.),
    // simplesmente não deduplicamos — não é motivo para falhar nada.
  }
}

async function registrarAcessoSite(user) {
  if (!user || jaRegistrouNestaSessao()) return;
  marcarSessaoComoRegistrada();
  try {
    await addDoc(collection(db, "acessos"), {
      email: user.email,
      criadoEm: serverTimestamp(),
      pagina: (typeof window !== "undefined" && window.location) ? window.location.pathname : "desconhecida",
      userAgent: (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent : "desconhecido"
    });
  } catch (erroRegistro) {
    // Não deixa nada travar por causa do registro de acesso —
    // só avisa no console se não conseguir gravar.
    console.warn("Não foi possível registrar o acesso:", erroRegistro);
  }
}

// --------------------------------------------------------------
// observarLogin(callback)
// Roda o callback sempre que o estado de login muda (usado para
// mostrar o e-mail logado na topbar). Também registra, em segundo
// plano, a entrada no portal na coleção "acessos" — uma vez por
// sessão de aba, não a cada módulo visitado (função listarAcessos
// permite consultar depois).
// --------------------------------------------------------------
export function observarLogin(callback) {
  onAuthStateChanged(auth, (user) => {
    registrarAcessoSite(user);
    callback(user);
  });
}
export async function excluirAcerto(id) { await deleteDoc(doc(db, "acertos", id)); }
export async function buscarAcerto(id) { 
  const snap = await getDoc(doc(db, "acertos", id)); 
  return snap.exists() ? { id: snap.id, ...snap.data() } : null; } 
export async function atualizarAcerto(id, tipo, dados) { 
  await setDoc(doc(db, "acertos", id), { tipo, dados, atualizadoEm: serverTimestamp() }, { merge: true }); }
export async function obterEstadoModulo(chave) { 
  const snap = await getDoc(doc(db, "estado_modulos", chave)); 
  return snap.exists() ? snap.data() : null; } 
export async function salvarEstadoModulo(chave, dados) { 
  await setDoc(doc(db, "estado_modulos", chave), dados); 
  return true; }

// --------------------------------------------------------------
// listarAcessos(email)
// Devolve os registros de acesso (gravados automaticamente pelo
// observarLogin() em toda página aberta autenticada), mais
// recentes primeiro. Passe um e-mail para filtrar só os acessos
// de uma pessoa específica, ou deixe em branco para ver todos.
// --------------------------------------------------------------
export async function listarAcessos(email) {
  const q = email
    ? query(collection(db, "acessos"), where("email", "==", email), orderBy("criadoEm", "desc"))
    : query(collection(db, "acessos"), orderBy("criadoEm", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
