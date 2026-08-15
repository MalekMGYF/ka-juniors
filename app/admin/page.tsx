"use client";

import { useEffect, useState } from "react";
import ShakeButton from "../../components/ShakeButton";
import SongAudioClipEditor from "../../components/SongAudioClipEditor";
import { SCHOOLS, getSchoolColor } from "../../lib/schools";

type Question = {
  id: string;
  description: string;
  answer_name: string;
  hint: string;
  active: boolean;
  target_school: string | null;
};

type UserRow = {
  id: string;
  full_name: string;
  nickname: string;
  school: string;
  points: number;
  coins: number;
  daily_points: number;
};

type DailySubmission = {
  id: string;
  answer_text: string;
  status: "pending" | "awarded" | "late" | "rejected";
  users: { nickname: string; full_name: string } | null;
};

type DailyQuestionRow = {
  id: string;
  question_text: string;
  target_school: string | null;
  max_answerers: number | null;
  scheduled_at: string;
  isCurrent: boolean;
  submissions: DailySubmission[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "قيد المراجعة",
  awarded: "✅ اتقبلت (أخد نقط)",
  late: "✅ صح بس متأخر",
  rejected: "❌ مرفوضة"
};

type AuctionRow = {
  id: string;
  item_name: string;
  item_description: string;
  end_time: string;
  settled: boolean;
  winner_user_id: string | null;
  winning_amount: number | null;
  winnerNickname: string | null;
  bids: { id: string; amount: number; created_at: string; nickname: string }[];
};

type TriviaQuestionRow = {
  id: string;
  question_text: string;
  options: string[];
  correct_index: number;
  is_active: boolean;
  activated_at: string | null;
  answersCount: number;
  correctCount: number;
};

type PictionaryWordRow = {
  id: string;
  word: string;
  is_active: boolean;
  created_at: string;
};

type SongQuestionRow = {
  id: string;
  title: string;
  prompt_text: string;
  full_line: string;
  options: string[];
  correct_index: number;
  intro_audio_path: string | null;
  full_audio_path: string | null;
  is_active: boolean;
  created_at: string;
  answersCount: number;
};

export default function AdminPage() {
  const [tab, setTab] = useState<
    "questions" | "users" | "daily" | "launch" | "notice" | "auction" | "cheer" | "trivia" | "songs" | "pictionaryWords"
  >("questions");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [description, setDescription] = useState("");
  const [answerName, setAnswerName] = useState("");
  const [hint, setHint] = useState("");
  const [targetSchool, setTargetSchool] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userError, setUserError] = useState("");

  const [dailyQuestions, setDailyQuestions] = useState<DailyQuestionRow[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [newDailyText, setNewDailyText] = useState("");
  const [newDailySchool, setNewDailySchool] = useState("");
  const [newDailyMax, setNewDailyMax] = useState("");
  const [dailyBusy, setDailyBusy] = useState(false);
  const [dailyError, setDailyError] = useState("");

  const [launchDate, setLaunchDate] = useState(""); // datetime-local value
  const [currentLaunchAt, setCurrentLaunchAt] = useState<string | null>(null);
  const [launchLoading, setLaunchLoading] = useState(true);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [launchError, setLaunchError] = useState("");
  const [launchSuccess, setLaunchSuccess] = useState("");

  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeButtonLabel, setNoticeButtonLabel] = useState("تمام");
  const [noticeEnabled, setNoticeEnabled] = useState(false);
  const [noticeLoading, setNoticeLoading] = useState(true);
  const [noticeBusy, setNoticeBusy] = useState(false);
  const [noticeError, setNoticeError] = useState("");
  const [noticeSuccess, setNoticeSuccess] = useState("");

  const [auctions, setAuctions] = useState<AuctionRow[]>([]);
  const [auctionLoading, setAuctionLoading] = useState(true);
  const [newAuctionName, setNewAuctionName] = useState("");
  const [newAuctionDesc, setNewAuctionDesc] = useState("");
  const [newAuctionEnd, setNewAuctionEnd] = useState("");
  const [auctionBusy, setAuctionBusy] = useState(false);
  const [auctionError, setAuctionError] = useState("");
  const [deletingAuctionId, setDeletingAuctionId] = useState<string | null>(null);

  const [triviaQuestions, setTriviaQuestions] = useState<TriviaQuestionRow[]>([]);
  const [triviaLoading, setTriviaLoading] = useState(true);
  const [newTriviaText, setNewTriviaText] = useState("");
  const [newTriviaOptions, setNewTriviaOptions] = useState(["", "", "", ""]);
  const [newTriviaCorrect, setNewTriviaCorrect] = useState(0);
  const [triviaBusy, setTriviaBusy] = useState(false);
  const [triviaError, setTriviaError] = useState("");
  const [triviaActionId, setTriviaActionId] = useState<string | null>(null);

  const [pictionaryWords, setPictionaryWords] = useState<PictionaryWordRow[]>([]);
  const [pictionaryWord, setPictionaryWord] = useState("");
  const [pictionarySearch, setPictionarySearch] = useState("");
  const [pictionaryLoading, setPictionaryLoading] = useState(true);
  const [pictionaryBusy, setPictionaryBusy] = useState(false);
  const [pictionaryError, setPictionaryError] = useState("");
  const [pictionaryDeleteId, setPictionaryDeleteId] = useState<string | null>(null);

  const [songQuestions, setSongQuestions] = useState<SongQuestionRow[]>([]);
  const [songLoading, setSongLoading] = useState(true);
  const [songBusy, setSongBusy] = useState(false);
  const [songError, setSongError] = useState("");
  const [songActionId, setSongActionId] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState("");
  const [songPrompt, setSongPrompt] = useState("");
  const [songFullLine, setSongFullLine] = useState("");
  const [songOptions, setSongOptions] = useState(["", "", "", ""]);
  const [songCorrect, setSongCorrect] = useState(0);
  const [songIntroFile, setSongIntroFile] = useState<File | null>(null);
  const [songFullFile, setSongFullFile] = useState<File | null>(null);
  const [songFileReset, setSongFileReset] = useState(0);
  const [editingSong, setEditingSong] = useState<SongQuestionRow | null>(null);
  const [editSongTitle, setEditSongTitle] = useState("");
  const [editSongPrompt, setEditSongPrompt] = useState("");
  const [editSongFullLine, setEditSongFullLine] = useState("");
  const [editSongOptions, setEditSongOptions] = useState(["", "", "", ""]);
  const [editSongCorrect, setEditSongCorrect] = useState(0);
  const [editSongIntroFile, setEditSongIntroFile] = useState<File | null>(null);
  const [editSongFullFile, setEditSongFullFile] = useState<File | null>(null);
  const [editRemoveIntro, setEditRemoveIntro] = useState(false);
  const [editRemoveFull, setEditRemoveFull] = useState(false);
  const [editSongBusy, setEditSongBusy] = useState(false);
  const [editSongFileReset, setEditSongFileReset] = useState(0);

  function isoToLocalInput(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  }

  async function loadLaunch() {
    setLaunchLoading(true);
    const res = await fetch("/api/launch-status", { cache: "no-store" });
    const data = await res.json();
    setCurrentLaunchAt(data.launchAt || null);
    setLaunchDate(data.launchAt ? isoToLocalInput(data.launchAt) : "");
    setLaunchLoading(false);
  }

  async function saveLaunch() {
    setLaunchError("");
    setLaunchSuccess("");
    if (!launchDate) {
      setLaunchError("اختار تاريخ ووقت");
      return;
    }
    setLaunchBusy(true);
    const res = await fetch("/api/admin/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ launchAt: new Date(launchDate).toISOString() })
    });
    const data = await res.json();
    setLaunchBusy(false);
    if (!res.ok) {
      setLaunchError(data.error || "حصل خطأ");
      return;
    }
    setLaunchSuccess("اتحفظ موعد الإطلاق");
    loadLaunch();
  }

  async function cancelLaunch() {
    setLaunchError("");
    setLaunchSuccess("");
    setLaunchBusy(true);
    const res = await fetch("/api/admin/launch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ launchAt: null })
    });
    setLaunchBusy(false);
    if (!res.ok) {
      setLaunchError("حصل خطأ");
      return;
    }
    setLaunchSuccess("اتلغى العداد، الموقع شغال عادي دلوقتي");
    loadLaunch();
  }

  async function loadNotice() {
    setNoticeLoading(true);
    const res = await fetch("/api/admin/site-notice", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.notice) {
      setNoticeMessage(data.notice.message || "");
      setNoticeButtonLabel(data.notice.buttonLabel || "تمام");
      setNoticeEnabled(data.notice.enabled === true);
    } else setNoticeError(data.error || "حصل خطأ أثناء تحميل التنبيه");
    setNoticeLoading(false);
  }

  async function saveNotice() {
    setNoticeError(""); setNoticeSuccess("");
    if (noticeEnabled && !noticeMessage.trim()) { setNoticeError("اكتب رسالة التنبيه الأول"); return; }
    setNoticeBusy(true);
    const res = await fetch("/api/admin/site-notice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: noticeEnabled, message: noticeMessage, buttonLabel: noticeButtonLabel }) });
    const data = await res.json().catch(() => ({}));
    setNoticeBusy(false);
    if (!res.ok) { setNoticeError(data.error || "حصل خطأ أثناء الحفظ"); return; }
    setNoticeSuccess(noticeEnabled ? "اتحفظ التنبيه وهيظهر مرة واحدة لكل زائر" : "التنبيه اتوقف");
    loadNotice();
  }

  async function loadAuctions() {
    setAuctionLoading(true);
    const res = await fetch("/api/admin/auction", { cache: "no-store" });
    const data = await res.json();
    setAuctions(data.auctions || []);
    setAuctionLoading(false);
  }

  async function createAuction() {
    setAuctionError("");
    if (!newAuctionName.trim() || !newAuctionEnd) {
      setAuctionError("اكتب اسم الجايزة ومعاد الانتهاء");
      return;
    }
    setAuctionBusy(true);
    const res = await fetch("/api/admin/auction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName: newAuctionName,
        itemDescription: newAuctionDesc,
        endTime: new Date(newAuctionEnd).toISOString()
      })
    });
    const data = await res.json();
    setAuctionBusy(false);
    if (!res.ok) {
      setAuctionError(data.error || "حصل خطأ");
      return;
    }
    setNewAuctionName("");
    setNewAuctionDesc("");
    setNewAuctionEnd("");
    loadAuctions();
  }

  async function deleteAuction(auctionId: string) {
    if (!confirm("متأكد إنك عايز تشيل المزاد ده؟ الإجراء ده مينفعش يترجع.")) {
      return;
    }
    setDeletingAuctionId(auctionId);
    const res = await fetch("/api/admin/auction", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId })
    });
    const data = await res.json();
    setDeletingAuctionId(null);
    if (!res.ok) {
      alert(data.error || "حصل خطأ وإحنا بنشيل المزاد");
      return;
    }
    loadAuctions();
  }

  async function loadTrivia() {
    setTriviaLoading(true);
    const res = await fetch("/api/admin/trivia", { cache: "no-store" });
    const data = await res.json();
    setTriviaQuestions(data.questions || []);
    setTriviaLoading(false);
  }

  async function loadPictionaryWords() {
    setPictionaryLoading(true);
    const res = await fetch("/api/admin/pictionary-words", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setPictionaryWords(data.words || []);
    setPictionaryError(res.ok ? "" : data.error || "حصل خطأ أثناء تحميل الكلمات");
    setPictionaryLoading(false);
  }

  async function loadSongs() {
    setSongLoading(true);
    const res = await fetch("/api/admin/songs", { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    setSongQuestions(data.questions || []);
    setSongError(res.ok ? "" : data.error || "حصل خطأ أثناء تحميل بنك الأغاني");
    setSongLoading(false);
  }

  async function createSong() {
    setSongError("");
    if (!songTitle.trim() || !songPrompt.trim() || !songFullLine.trim() || !songPrompt.includes("…")) {
      setSongError("اكتب العنوان والجملة وعلامة … مكان الجزء الناقص");
      return;
    }
    if (songOptions.some((option) => !option.trim())) {
      setSongError("اكتب الأربع اختيارات كلها");
      return;
    }
    setSongBusy(true);
    const form = new FormData();
    form.append("title", songTitle);
    form.append("promptText", songPrompt);
    form.append("fullLine", songFullLine);
    songOptions.forEach((option, index) => form.append(`option${index}`, option));
    form.append("correctIndex", String(songCorrect));
    if (songIntroFile) form.append("introAudio", songIntroFile);
    if (songFullFile) form.append("fullAudio", songFullFile);
    const res = await fetch("/api/admin/songs", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setSongBusy(false);
    if (!res.ok) { setSongError(data.error || "حصل خطأ أثناء إضافة السؤال"); return; }
    setSongTitle(""); setSongPrompt(""); setSongFullLine(""); setSongOptions(["", "", "", ""]); setSongCorrect(0); setSongIntroFile(null); setSongFullFile(null); setSongFileReset((value) => value + 1);
    void loadSongs();
  }

  async function toggleSong(question: SongQuestionRow) {
    setSongActionId(question.id); setSongError("");
    const res = await fetch("/api/admin/songs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id, isActive: !question.is_active }) });
    const data = await res.json().catch(() => ({}));
    setSongActionId(null);
    if (!res.ok) { setSongError(data.error || "حصل خطأ أثناء تحديث السؤال"); return; }
    void loadSongs();
  }

  async function deleteSong(question: SongQuestionRow) {
    if (!window.confirm(`متأكد إنك عايز تحذف سؤال «${question.title}»؟`)) return;
    setSongActionId(question.id); setSongError("");
    const res = await fetch("/api/admin/songs", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionId: question.id }) });
    const data = await res.json().catch(() => ({}));
    setSongActionId(null);
    if (!res.ok) { setSongError(data.error || "حصل خطأ أثناء حذف السؤال"); return; }
    void loadSongs();
  }

  function beginSongEdit(question: SongQuestionRow) {
    setSongError("");
    setEditingSong(question);
    setEditSongTitle(question.title);
    setEditSongPrompt(question.prompt_text);
    setEditSongFullLine(question.full_line);
    setEditSongOptions([...question.options]);
    setEditSongCorrect(question.correct_index);
    setEditSongIntroFile(null);
    setEditSongFullFile(null);
    setEditRemoveIntro(false);
    setEditRemoveFull(false);
    setEditSongFileReset((value) => value + 1);
  }

  function closeSongEdit() {
    if (editSongBusy) return;
    setEditingSong(null);
  }

  async function saveSongEdit() {
    if (!editingSong) return;
    setSongError("");
    if (!editSongTitle.trim() || !editSongPrompt.trim() || !editSongFullLine.trim() || !editSongPrompt.includes("…")) {
      setSongError("اكتب العنوان والجملة وعلامة … مكان الجزء الناقص");
      return;
    }
    if (editSongOptions.some((option) => !option.trim())) {
      setSongError("اكتب الأربع اختيارات كلها");
      return;
    }
    setEditSongBusy(true);
    const form = new FormData();
    form.append("questionId", editingSong.id);
    form.append("title", editSongTitle);
    form.append("promptText", editSongPrompt);
    form.append("fullLine", editSongFullLine);
    editSongOptions.forEach((option, index) => form.append(`option${index}`, option));
    form.append("correctIndex", String(editSongCorrect));
    form.append("removeIntro", String(editRemoveIntro && !editSongIntroFile));
    form.append("removeFull", String(editRemoveFull && !editSongFullFile));
    if (editSongIntroFile) form.append("introAudio", editSongIntroFile);
    if (editSongFullFile) form.append("fullAudio", editSongFullFile);
    const res = await fetch("/api/admin/songs", { method: "PATCH", body: form });
    const data = await res.json().catch(() => ({}));
    setEditSongBusy(false);
    if (!res.ok) { setSongError(data.error || "حصل خطأ أثناء حفظ التعديل"); return; }
    setEditingSong(null);
    void loadSongs();
  }

  async function createPictionaryWord() {
    const word = pictionaryWord.trim();
    if (!word) { setPictionaryError("اكتب كلمة الأول"); return; }
    setPictionaryBusy(true); setPictionaryError("");
    const res = await fetch("/api/admin/pictionary-words", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ word }) });
    const data = await res.json().catch(() => ({}));
    setPictionaryBusy(false);
    if (!res.ok) { setPictionaryError(data.error || "حصل خطأ أثناء الإضافة"); return; }
    setPictionaryWord("");
    loadPictionaryWords();
  }

  async function deletePictionaryWord(wordId: string, word: string) {
    if (!window.confirm(`متأكد إنك عايز تحذف كلمة «${word}»؟`)) return;
    setPictionaryDeleteId(wordId); setPictionaryError("");
    const res = await fetch("/api/admin/pictionary-words", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wordId }) });
    const data = await res.json().catch(() => ({}));
    setPictionaryDeleteId(null);
    if (!res.ok) { setPictionaryError(data.error || "حصل خطأ أثناء الحذف"); return; }
    loadPictionaryWords();
  }

  async function createTrivia() {
    setTriviaError("");
    if (!newTriviaText.trim() || newTriviaOptions.some((o) => !o.trim())) {
      setTriviaError("اكتب نص السؤال والأربع اختيارات كلها");
      return;
    }
    setTriviaBusy(true);
    const res = await fetch("/api/admin/trivia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionText: newTriviaText,
        options: newTriviaOptions,
        correctIndex: newTriviaCorrect
      })
    });
    const data = await res.json();
    setTriviaBusy(false);
    if (!res.ok) {
      setTriviaError(data.error || "حصل خطأ");
      return;
    }
    setNewTriviaText("");
    setNewTriviaOptions(["", "", "", ""]);
    setNewTriviaCorrect(0);
    loadTrivia();
  }

  async function activateTrivia(questionId: string) {
    setTriviaActionId(questionId);
    const res = await fetch("/api/admin/trivia/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action: "activate" })
    });
    const data = await res.json();
    setTriviaActionId(null);
    if (!res.ok) {
      alert(data.error || "حصل خطأ");
      return;
    }
    loadTrivia();
  }

  async function deactivateTrivia(questionId: string) {
    setTriviaActionId(questionId);
    const res = await fetch("/api/admin/trivia/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action: "deactivate" })
    });
    const data = await res.json();
    setTriviaActionId(null);
    if (!res.ok) {
      alert(data.error || "حصل خطأ");
      return;
    }
    loadTrivia();
  }

  async function deleteTrivia(questionId: string) {
    if (!confirm("متأكد إنك عايز تشيل السؤال ده؟")) return;
    setTriviaActionId(questionId);
    const res = await fetch("/api/admin/trivia", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId })
    });
    const data = await res.json();
    setTriviaActionId(null);
    if (!res.ok) {
      alert(data.error || "حصل خطأ");
      return;
    }
    loadTrivia();
  }

  const [cheerCounts, setCheerCounts] = useState<Record<string, number>>({});
  const [cheerLoading, setCheerLoading] = useState(true);
  const [cheerError, setCheerError] = useState("");
  const [dailyDeleteBusyId, setDailyDeleteBusyId] = useState<string | null>(null);

  async function loadCheer() {
    setCheerLoading(true);
    const res = await fetch("/api/admin/cheer", { cache: "no-store" });
    const data = await res.json();
    setCheerCounts(data.counts || {});
    setCheerLoading(false);
  }

  async function resetCheer(school: string) {
    const confirmation = window.prompt(`تحذير: تصفير تكبيس "${school}" لا يمكن التراجع عنه. اكتب اسم المدرسة كاملًا للتأكيد.`);
    if (confirmation !== school) {
      if (confirmation !== null) setCheerError("اسم المدرسة غير مطابق، لم يتم تصفير أي بيانات.");
      return;
    }

    setCheerError("");
    const res = await fetch("/api/admin/cheer", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school, confirmation })
    });
    if (!res.ok) {
      const data = await res.json();
      setCheerError(data.error || "حصل خطأ");
      return;
    }
    loadCheer();
  }

  async function deleteDailyQuestion(id: string) {
    const confirmed = window.confirm(
      "متأكد إنك عايز تحذف السؤال ده؟ هتتمسح معاه كل الإجابات اللي جت عليه."
    );
    if (!confirmed) return;

    setDailyError("");
    setDailyDeleteBusyId(id);
    const res = await fetch("/api/admin/daily", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    setDailyDeleteBusyId(null);
    if (!res.ok) {
      const data = await res.json();
      setDailyError(data.error || "حصل خطأ");
      return;
    }
    loadDaily();
  }

  async function loadQuestions() {
    const res = await fetch("/api/admin/questions");
    const data = await res.json();
    setQuestions(data.questions || []);
    setLoading(false);
  }

  async function loadUsers() {
    setUsersLoading(true);
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
    setUsersLoading(false);
  }

  async function loadDaily() {
    setDailyLoading(true);
    const res = await fetch("/api/admin/daily");
    const data = await res.json();
    setDailyQuestions(data.questions || []);
    setDailyLoading(false);
  }

  useEffect(() => {
    loadQuestions();
    loadUsers();
    loadDaily();
    loadLaunch();
    loadNotice();
    loadAuctions();
    loadCheer();
    loadTrivia();
    loadSongs();
    loadPictionaryWords();
  }, []);

  async function addQuestion() {
    setError("");
    setSuccess("");
    if (!description || !answerName) {
      setError("اكتب الوصف واسم الطالب");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, answerName, hint, targetSchool: targetSchool || null })
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "حصل خطأ");
      return;
    }
    setDescription("");
    setAnswerName("");
    setHint("");
    setTargetSchool("");
    setSuccess("اتضاف بنجاح");
    loadQuestions();
  }

  async function toggleActive(q: Question) {
    await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: q.id, active: !q.active })
    });
    loadQuestions();
  }

  async function removeQuestion(id: string) {
    await fetch("/api/admin/questions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    loadQuestions();
  }

  async function removeUser(u: UserRow) {
    const confirmed = window.confirm(
      `متأكد إنك عايز تمسح حساب "${u.nickname}"؟ الحساب ده هيتمسح نهائي مع كل نقطه وكوناته.`
    );
    if (!confirmed) return;

    setUserError("");
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id })
    });
    if (!res.ok) {
      const data = await res.json();
      setUserError(data.error || "حصل خطأ");
      return;
    }
    loadUsers();
  }

  async function adjustUser(id: string, field: "points" | "coins" | "daily_points", amount: number) {
    setUserError("");
    const res = await fetch("/api/admin/users/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, field, amount })
    });
    if (!res.ok) {
      const data = await res.json();
      setUserError(data.error || "حصل خطأ");
      return;
    }
    loadUsers();
  }

  async function createDailyQuestion() {
    setDailyError("");
    if (!newDailyText.trim()) {
      setDailyError("اكتب نص السؤال");
      return;
    }
    setDailyBusy(true);
    const res = await fetch("/api/admin/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionText: newDailyText,
        targetSchool: newDailySchool || null,
        maxAnswerers: newDailyMax ? Number(newDailyMax) : null
      })
    });
    const data = await res.json();
    setDailyBusy(false);
    if (!res.ok) {
      setDailyError(data.error || "حصل خطأ");
      return;
    }
    setNewDailyText("");
    setNewDailySchool("");
    setNewDailyMax("");
    loadDaily();
  }

  async function reviewAnswer(id: string, decision: "approve" | "reject") {
    await fetch("/api/admin/daily/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answerId: id, decision })
    });
    loadDaily();
  }

  function formatSchedule(iso: string) {
    return new Date(iso).toLocaleString("ar-EG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return (
    <div className="page">
      <div className="nav">
        <div className="logo-mark">
          <span className="spark">✦</span>
          لوحة تحكم K.A Juniors
        </div>
        <a href="/leaderboard" className="nav-link">الموقع</a>
      </div>

      <div className="container">
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button
            className={tab === "questions" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("questions")}
          >
            أسئلة خمن الطالب
          </button>
          <button
            className={tab === "daily" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("daily")}
          >
            السؤال اليومي
          </button>
          <button
            className={tab === "users" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("users")}
          >
            الحسابات ({users.length})
          </button>
          <button
            className={tab === "launch" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("launch")}
          >
            موعد الإطلاق
          </button>
          <button
            className={tab === "notice" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("notice")}
          >
            تنبيه الموقع
          </button>
          <button
            className={tab === "auction" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("auction")}
          >
            المزاد
          </button>
          <button
            className={tab === "cheer" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("cheer")}
          >
            التكبيس
          </button>
          <button
            className={tab === "trivia" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("trivia")}
          >
            تحدي المعلومات
          </button>
          <button
            className={tab === "songs" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("songs")}
          >
            كمل الأغنية ({songQuestions.length})
          </button>
          <button
            className={tab === "pictionaryWords" ? "nav-link active" : "nav-link"}
            style={{ cursor: "pointer", background: "none", border: "1px solid var(--border)" }}
            onClick={() => setTab("pictionaryWords")}
          >
            كلمات ارسم واتقال ({pictionaryWords.length})
          </button>
        </div>

        {tab === "questions" && (
          <>
            <div className="card" style={{ marginBottom: 22 }}>
              <h3 style={{ marginTop: 0 }}>ضيف سؤال جديد لخمن الطالب</h3>

              {error && <div className="error-text">{error}</div>}
              {success && <div className="success-text">{success}</div>}

              <div className="field">
                <label>الوصف اللي هيظهر للطلاب (مثال: بنت محجبة وشقية في الفصل)</label>
                <input
                  className="input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="field">
                <label>اسم الطالب الصحيح (الإجابة)</label>
                <input
                  className="input"
                  value={answerName}
                  onChange={(e) => setAnswerName(e.target.value)}
                />
              </div>

              <div className="field">
                <label>التلميح (يظهر لو حد اشتراه بـ10 كوين)</label>
                <input
                  className="input"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                />
              </div>

              <div className="field">
                <label>يظهر لمدرسة معينة بس؟ (اختياري)</label>
                <select
                  className="input"
                  value={targetSchool}
                  onChange={(e) => setTargetSchool(e.target.value)}
                >
                  <option value="">كل المدارس</option>
                  {SCHOOLS.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <ShakeButton className="btn btn-gold" onClick={addQuestion} disabled={busy}>
                {busy ? "جاري الإضافة..." : "أضف السؤال"}
              </ShakeButton>
            </div>

            <h3>الأسئلة الحالية</h3>
            {loading ? (
              <div className="card empty">جاري التحميل...</div>
            ) : questions.length === 0 ? (
              <div className="card empty">لسه معملتش أي سؤال</div>
            ) : (
              <div className="list">
                {questions.map((q) => (
                  <div className="card card-tight" key={q.id}>
                    <div className="row" style={{ background: "transparent", border: "none", padding: 0 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{q.description}</div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                          الإجابة: {q.answer_name} {q.hint && `— تلميح: ${q.hint}`}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                          <span className="school-dot" style={{ background: getSchoolColor(q.target_school) }} />
                          <span className="muted" style={{ fontSize: 12 }}>
                            {q.target_school || "كل المدارس"}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn btn-outline"
                          style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
                          onClick={() => toggleActive(q)}
                        >
                          {q.active ? "متاح" : "متوقف"}
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
                          onClick={() => removeQuestion(q.id)}
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "daily" && (
          <>
            <div className="card" style={{ marginBottom: 22 }}>
              <h3 style={{ marginTop: 0 }}>ضيف سؤال يومي جديد للقائمة</h3>
              <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
                كل سؤال بيظهر 24 ساعة بعد اللي قبله في نفس نطاق المدرسة، بالترتيب
              </p>

              {dailyError && <div className="error-text">{dailyError}</div>}

              <div className="field">
                <label>نص السؤال</label>
                <input
                  className="input"
                  value={newDailyText}
                  onChange={(e) => setNewDailyText(e.target.value)}
                />
              </div>

              <div className="field">
                <label>يظهر لمدرسة معينة بس؟ (اختياري)</label>
                <select
                  className="input"
                  value={newDailySchool}
                  onChange={(e) => setNewDailySchool(e.target.value)}
                >
                  <option value="">كل المدارس</option>
                  {SCHOOLS.map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>أقصى عدد يقدر يجاوب (اختياري، سيبها فاضية = بدون حد)</label>
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={newDailyMax}
                  onChange={(e) => setNewDailyMax(e.target.value)}
                  placeholder="مثال: 10"
                />
              </div>

              <ShakeButton className="btn btn-gold" onClick={createDailyQuestion} disabled={dailyBusy}>
                {dailyBusy ? "جاري الإضافة..." : "ضيف للقائمة"}
              </ShakeButton>
            </div>

            <h3>قائمة الأسئلة اليومية</h3>
            {dailyLoading ? (
              <div className="card empty">جاري التحميل...</div>
            ) : dailyQuestions.length === 0 ? (
              <div className="card empty">لسه معملتش أي سؤال يومي</div>
            ) : (
              <div className="list">
                {dailyQuestions.map((q) => (
                  <div
                    className="card card-tight"
                    key={q.id}
                    style={{ borderColor: q.isCurrent ? "var(--gold)" : undefined }}
                  >
                    <div style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>
                          {q.question_text}{" "}
                          {q.isCurrent && <span className="badge badge-coin" style={{ fontSize: 11 }}>شغال دلوقتي</span>}
                        </div>
                        <button
                          className="btn btn-danger"
                          style={{ width: "auto", padding: "6px 12px", fontSize: 12, flexShrink: 0 }}
                          onClick={() => deleteDailyQuestion(q.id)}
                          disabled={dailyDeleteBusyId === q.id}
                        >
                          {dailyDeleteBusyId === q.id ? "جاري الحذف..." : "حذف"}
                        </button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                        <span className="school-dot" style={{ background: getSchoolColor(q.target_school) }} />
                        <span className="muted" style={{ fontSize: 12 }}>
                          {q.target_school || "كل المدارس"} — من {formatSchedule(q.scheduled_at)}
                          {q.max_answerers ? ` — حد أقصى ${q.max_answerers} إجابة (${q.submissions.length} جت)` : ""}
                        </span>
                      </div>
                    </div>

                    {q.submissions.length === 0 ? (
                      <div className="muted" style={{ fontSize: 13 }}>لسه محدش جاوب</div>
                    ) : (
                      <div className="list" style={{ marginTop: 10 }}>
                        {q.submissions.map((s) => (
                          <div
                            key={s.id}
                            style={{
                              padding: "10px 12px",
                              background: "var(--bg-soft)",
                              borderRadius: 12,
                              border: "1px solid var(--border)"
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13 }}>
                              {s.users?.nickname}{" "}
                              <span className="muted" style={{ fontWeight: 400, fontSize: 11 }}>
                                ({s.users?.full_name})
                              </span>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 14 }}>{s.answer_text}</div>
                            {s.status === "pending" ? (
                              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                <button
                                  className="btn btn-gold"
                                  style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
                                  onClick={() => reviewAnswer(s.id, "approve")}
                                >
                                  قبول
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
                                  onClick={() => reviewAnswer(s.id, "reject")}
                                >
                                  رفض
                                </button>
                              </div>
                            ) : (
                              <span className="muted" style={{ fontSize: 12 }}>{STATUS_LABEL[s.status]}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "users" && (
          <>
            <h3 style={{ marginTop: 0 }}>الحسابات المسجلة</h3>
            {userError && <div className="error-text">{userError}</div>}
            {usersLoading ? (
              <div className="card empty">جاري التحميل...</div>
            ) : users.length === 0 ? (
              <div className="card empty">مفيش حسابات مسجلة لسه</div>
            ) : (
              <div className="list">
                {users.map((u) => (
                  <div className="card card-tight" key={u.id}>
                    <div className="row" style={{ background: "transparent", border: "none", padding: 0 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{u.nickname}</div>
                        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                          {u.full_name} — {u.school}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                          <span className="badge badge-point">⭐ {u.points}</span>
                          <span className="badge badge-coin">🪙 {u.coins}</span>
                          <span className="badge">📅 {u.daily_points}</span>
                        </div>
                      </div>
                      <button
                        className="btn btn-danger"
                        style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
                        onClick={() => removeUser(u)}
                      >
                        امسح الحساب
                      </button>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "1px solid var(--border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="muted" style={{ fontSize: 13 }}>⭐ نقاط خمن الطالب</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-outline"
                            style={{ width: "auto", padding: "4px 12px", fontSize: 13 }}
                            onClick={() => adjustUser(u.id, "points", -1)}
                          >
                            −1
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ width: "auto", padding: "4px 12px", fontSize: 13 }}
                            onClick={() => adjustUser(u.id, "points", 1)}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="muted" style={{ fontSize: 13 }}>🪙 الكوينات</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-outline"
                            style={{ width: "auto", padding: "4px 12px", fontSize: 13 }}
                            onClick={() => adjustUser(u.id, "coins", -5)}
                          >
                            −5
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ width: "auto", padding: "4px 12px", fontSize: 13 }}
                            onClick={() => adjustUser(u.id, "coins", 5)}
                          >
                            +5
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="muted" style={{ fontSize: 13 }}>📅 نقاط السؤال اليومي</span>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-outline"
                            style={{ width: "auto", padding: "4px 12px", fontSize: 13 }}
                            onClick={() => adjustUser(u.id, "daily_points", -1)}
                          >
                            −1
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ width: "auto", padding: "4px 12px", fontSize: 13 }}
                            onClick={() => adjustUser(u.id, "daily_points", 1)}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "launch" && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>معاد إطلاق الموقع</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              لو حددت موعد، أي حد يفتح الموقع (حتى لو مسجل دخول) هيشوف عداد تنازلي لحد
              ما يوصل الموعد ده. صفحات الأدمن بتفضل شغالة عادي عشان تقدر تتحكم فيه وهو
              مقفول.
            </p>

            {launchLoading ? (
              <div className="empty">جاري التحميل...</div>
            ) : (
              <>
                {launchError && <div className="error-text">{launchError}</div>}
                {launchSuccess && <div className="success-text">{launchSuccess}</div>}

                <div style={{ marginBottom: 12 }}>
                  {currentLaunchAt ? (
                    <span className="badge badge-coin">
                      ⏳ الموعد الحالي: {new Date(currentLaunchAt).toLocaleString("ar-EG")}
                    </span>
                  ) : (
                    <span className="badge">مفيش موعد محفوظ، الموقع شغال عادي</span>
                  )}
                </div>

                <div className="field">
                  <label>حدد يوم وساعة الإطلاق</label>
                  <input
                    className="input"
                    type="datetime-local"
                    value={launchDate}
                    onChange={(e) => setLaunchDate(e.target.value)}
                  />
                </div>

                <ShakeButton className="btn btn-gold" onClick={saveLaunch} disabled={launchBusy}>
                  {launchBusy ? "جاري الحفظ..." : "احفظ موعد الإطلاق"}
                </ShakeButton>

                {currentLaunchAt && (
                  <button
                    className="btn btn-outline"
                    style={{ marginTop: 10 }}
                    onClick={cancelLaunch}
                    disabled={launchBusy}
                  >
                    إلغاء العداد (شغّل الموقع فورًا)
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {tab === "notice" && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>تنبيه يظهر للزوار</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>اكتب رسالة، فعّلها، وكل زائر هيشوفها مرة واحدة فقط. لو عدّلت الرسالة أو الزر، هتظهر النسخة الجديدة مرة واحدة كمان.</p>
            {noticeLoading ? <div className="empty">جاري التحميل...</div> : <>
              {noticeError && <div className="error-text">{noticeError}</div>}
              {noticeSuccess && <div className="success-text">{noticeSuccess}</div>}
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontWeight: 700 }}>
                <input type="checkbox" checked={noticeEnabled} onChange={(e) => setNoticeEnabled(e.target.checked)} /> فعّل التنبيه للزوار
              </label>
              <div className="field"><label>رسالة التنبيه</label><textarea className="input" rows={4} maxLength={500} value={noticeMessage} placeholder="مثال: بكرة فيه تحدي جديد الساعة 8" onChange={(e) => setNoticeMessage(e.target.value)} /></div>
              <div className="field"><label>كلمة زر التأكيد</label><input className="input" maxLength={32} value={noticeButtonLabel} placeholder="تمام" onChange={(e) => setNoticeButtonLabel(e.target.value)} /></div>
              <ShakeButton className="btn btn-gold" onClick={saveNotice} disabled={noticeBusy}>{noticeBusy ? "جاري الحفظ..." : "احفظ التنبيه"}</ShakeButton>
            </>}
          </div>
        )}

        {tab === "auction" && (
          <>
            <div className="card" style={{ marginBottom: 22 }}>
              <h3 style={{ marginTop: 0 }}>ضيف مزاد جديد</h3>
              {auctionError && <div className="error-text">{auctionError}</div>}

              <div className="field">
                <label>اسم الجايزة</label>
                <input
                  className="input"
                  value={newAuctionName}
                  onChange={(e) => setNewAuctionName(e.target.value)}
                />
              </div>

              <div className="field">
                <label>وصف الجايزة</label>
                <input
                  className="input"
                  value={newAuctionDesc}
                  onChange={(e) => setNewAuctionDesc(e.target.value)}
                />
              </div>

              <div className="field">
                <label>معاد انتهاء المزاد</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={newAuctionEnd}
                  onChange={(e) => setNewAuctionEnd(e.target.value)}
                />
              </div>

              <ShakeButton className="btn btn-gold" onClick={createAuction} disabled={auctionBusy}>
                {auctionBusy ? "جاري الإضافة..." : "ابدأ المزاد"}
              </ShakeButton>
            </div>

            <h3>المزادات</h3>
            {auctionLoading ? (
              <div className="card empty">جاري التحميل...</div>
            ) : auctions.length === 0 ? (
              <div className="card empty">لسه معملتش أي مزاد</div>
            ) : (
              <div className="list">
                {auctions.map((a) => (
                  <div className="card card-tight" key={a.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{a.item_name}</div>
                      {a.settled && (
                        <button
                          className="btn btn-danger"
                          style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                          onClick={() => deleteAuction(a.id)}
                          disabled={deletingAuctionId === a.id}
                        >
                          {deletingAuctionId === a.id ? "جاري الحذف..." : "🗑️ شيل المزاد"}
                        </button>
                      )}
                    </div>
                    {a.item_description && (
                      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                        {a.item_description}
                      </div>
                    )}
                    <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      ينتهي: {new Date(a.end_time).toLocaleString("ar-EG")} —{" "}
                      {a.settled ? "اتقفل" : "شغال"}
                    </div>
                    {a.settled && a.winnerNickname && (
                      <div className="success-text" style={{ marginTop: 6 }}>
                        🏆 الفايز: {a.winnerNickname} بـ {a.winning_amount} كوين
                      </div>
                    )}

                    <div style={{ marginTop: 10 }}>
                      <span className="muted" style={{ fontSize: 12 }}>
                        كل المزايدات ({a.bids.length})
                      </span>
                      {a.bids.length === 0 ? (
                        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                          لسه محدش زايد
                        </div>
                      ) : (
                        <div className="list" style={{ marginTop: 6 }}>
                          {a.bids.map((b) => (
                            <div
                              key={b.id}
                              style={{
                                padding: "8px 12px",
                                background: "var(--bg-soft)",
                                borderRadius: 10,
                                border: "1px solid var(--border)",
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 13
                              }}
                            >
                              <span>{b.nickname}</span>
                              <span>🪙 {b.amount}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "cheer" && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>تكبيس المدارس</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              تقدر تصفّر عداد أي مدرسة لو حبيت (مثلًا لو حصل غش أو عايز تبدأ الترتيب من
              جديد). العداد بيرجع صفر لكل الناس فورًا في صفحة التكبيس.
            </p>

            {cheerError && <div className="error-text">{cheerError}</div>}

            {cheerLoading ? (
              <div className="empty">جاري التحميل...</div>
            ) : (
              <div className="list">
                {SCHOOLS.map((s) => (
                  <div className="card card-tight" key={s.name}>
                    <div
                      className="row"
                      style={{ background: "transparent", border: "none", padding: 0 }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="school-dot" style={{ background: s.color }} />
                        <div style={{ fontWeight: 700 }}>{s.name}</div>
                        <span className="badge" style={{ color: s.color }}>
                          ❤️ {cheerCounts[s.name] || 0}
                        </span>
                      </div>
                      <button
                        className="btn btn-danger"
                        style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
                        onClick={() => resetCheer(s.name)}
                        disabled={!cheerCounts[s.name]}
                      >
                        صفّر التكبيس
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "trivia" && (
          <>
            <div className="card" style={{ marginBottom: 22 }}>
              <h3 style={{ marginTop: 0 }}>ضيف سؤال جديد لتحدي المعلومات</h3>
              {triviaError && <div className="error-text">{triviaError}</div>}

              <div className="field">
                <label>نص السؤال</label>
                <input
                  className="input"
                  value={newTriviaText}
                  onChange={(e) => setNewTriviaText(e.target.value)}
                />
              </div>

              {newTriviaOptions.map((opt, idx) => (
                <div className="field" key={idx}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name="triviaCorrect"
                      checked={newTriviaCorrect === idx}
                      onChange={() => setNewTriviaCorrect(idx)}
                    />
                    اختيار {idx + 1} {newTriviaCorrect === idx ? "(الإجابة الصح)" : ""}
                  </label>
                  <input
                    className="input"
                    value={opt}
                    onChange={(e) => {
                      const copy = [...newTriviaOptions];
                      copy[idx] = e.target.value;
                      setNewTriviaOptions(copy);
                    }}
                  />
                </div>
              ))}

              <ShakeButton className="btn btn-gold" onClick={createTrivia} disabled={triviaBusy}>
                {triviaBusy ? "جاري الإضافة..." : "ضيف السؤال للبنك"}
              </ShakeButton>
            </div>

            <h3>بنك الأسئلة</h3>
            {triviaLoading ? (
              <div className="card empty">جاري التحميل...</div>
            ) : triviaQuestions.length === 0 ? (
              <div className="card empty">لسه معملتش أي سؤال</div>
            ) : (
              <div className="list">
                {triviaQuestions.map((q) => (
                  <div className="card card-tight" key={q.id}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{q.question_text}</div>
                      {q.is_active && (
                        <span className="badge" style={{ color: "var(--mint)", whiteSpace: "nowrap" }}>
                          🟢 شغال دلوقتي
                        </span>
                      )}
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 4 }}>
                      {q.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className="muted"
                          style={{
                            fontSize: 13,
                            color: idx === q.correct_index ? "var(--mint)" : undefined,
                            fontWeight: idx === q.correct_index ? 700 : 400
                          }}
                        >
                          {idx === q.correct_index ? "✅ " : "• "}
                          {opt}
                        </div>
                      ))}
                    </div>

                    <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                      عدد اللي جاوبوا: {q.answersCount} — منهم صح: {q.correctCount}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {q.is_active ? (
                        <button
                          className="btn btn-danger"
                          style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
                          onClick={() => deactivateTrivia(q.id)}
                          disabled={triviaActionId === q.id}
                        >
                          {triviaActionId === q.id ? "..." : "وقف السؤال"}
                        </button>
                      ) : (
                        <button
                          className="btn btn-gold"
                          style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
                          onClick={() => activateTrivia(q.id)}
                          disabled={triviaActionId === q.id}
                        >
                          {triviaActionId === q.id ? "..." : "فعّل السؤال (10 ثواني)"}
                        </button>
                      )}
                      {!q.is_active && (
                        <button
                          className="btn btn-danger"
                          style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
                          onClick={() => deleteTrivia(q.id)}
                          disabled={triviaActionId === q.id}
                        >
                          شيل السؤال
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "songs" && (
          <>
            <div className="card song-admin-card" style={{ marginBottom: 22 }}>
              <span className="song-eyebrow">بنك كمل الأغنية</span>
              <h3 style={{ marginTop: 7 }}>ضيف سؤال ومقاطع الصوت</h3>
              <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 16 }}>اكتب علامة «…» مكان الجزء الناقص. اللاعب عنده 40 ثانية، والصح ياخد 5 نقاط أغاني والغلط ياخد نقطة واحدة.</p>
              {songError && <div className="error-text">{songError}</div>}
              <div className="field"><label>اسم الأغنية أو عنوان داخلي</label><input className="input" value={songTitle} maxLength={120} placeholder="مثال: سؤال الأسبوع الأول" onChange={(e) => setSongTitle(e.target.value)} /></div>
              <div className="field"><label>السطر قبل الإجابة</label><textarea className="input song-admin-textarea" value={songPrompt} maxLength={500} placeholder="مثال: من الإسكندرية للقاهرة لـ…" onChange={(e) => setSongPrompt(e.target.value)} /><small className="muted">علامة «…» إلزامية في مكان الكلمة أو الجملة الناقصة.</small></div>
              <div className="field"><label>الجملة الكاملة بعد الإجابة</label><textarea className="input song-admin-textarea" value={songFullLine} maxLength={700} placeholder="مثال: من الإسكندرية للقاهرة لأسوان" onChange={(e) => setSongFullLine(e.target.value)} /></div>
              {songOptions.map((option, index) => (
                <div className="field" key={index}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="radio" name="songCorrect" checked={songCorrect === index} onChange={() => setSongCorrect(index)} /> اختيار {index + 1} {songCorrect === index ? "(الإجابة الصح)" : ""}</label>
                  <input className="input" value={option} maxLength={160} onChange={(e) => { const copy = [...songOptions]; copy[index] = e.target.value; setSongOptions(copy); }} />
                </div>
              ))}
              <div className="song-admin-audio-grid">
                <div className="field"><label>مقطع قبل الإجابة (اختياري)</label><input key={`intro-${songFileReset}`} className="input" type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/ogg" onChange={(e) => setSongIntroFile(e.target.files?.[0] || null)} /><small className="muted">MP3 أو M4A أو WAV أو AAC أو OGG، حتى 5 ميجابايت.</small></div>
                <div className="field"><label>المقطع الكامل بعد الإجابة (اختياري)</label><input key={`full-${songFileReset}`} className="input" type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/ogg" onChange={(e) => setSongFullFile(e.target.files?.[0] || null)} /><small className="muted">يتشغل تلقائيًا بعد النتيجة لو تم رفعه.</small></div>
              </div>
              <SongAudioClipEditor key={`create-clip-${songFileReset}`} introFile={songIntroFile} fullFile={songFullFile} onIntroFile={setSongIntroFile} onFullFile={setSongFullFile} saveHint="بعد كده اضغط «أضف سؤال كمل الأغنية»؛ وقتها المقطع هيرتفع ويتربط بالسؤال." disabled={songBusy} />
              <ShakeButton className="btn btn-gold" onClick={createSong} disabled={songBusy}>{songBusy ? "جاري الحفظ والرفع…" : "أضف سؤال كمل الأغنية"}</ShakeButton>
            </div>
            <h3>أسئلة كمل الأغنية الحالية ({songQuestions.length})</h3>
            {songLoading ? <div className="card empty">جاري تحميل بنك الأغاني…</div> : songQuestions.length === 0 ? <div className="card empty">لسه مفيش أسئلة. أضف سؤال ومقطع صوت من فوق.</div> : (
              <div className="list">
                {songQuestions.map((question) => (
                  <div className="card card-tight" key={question.id} style={{ borderColor: question.is_active ? "rgba(246,199,90,.36)" : undefined }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}><div><div style={{ fontWeight: 800, fontSize: 16 }}>{question.title}</div><div className="muted" style={{ fontSize: 13, marginTop: 5 }}>{question.prompt_text}</div></div><span className="badge" style={{ color: question.is_active ? "var(--mint)" : "var(--muted)", whiteSpace: "nowrap" }}>{question.is_active ? "🟢 متاح" : "⏸ متوقف"}</span></div>
                    <div style={{ display: "grid", gap: 4, marginTop: 10 }}>{question.options.map((option, index) => <div key={index} className="muted" style={{ color: index === question.correct_index ? "var(--mint)" : undefined, fontWeight: index === question.correct_index ? 800 : 400, fontSize: 13 }}>{index === question.correct_index ? "✅ " : "• "}{option}</div>)}</div>
                    <div className="song-admin-meta"><span>{question.intro_audio_path ? "✓ مقطع بداية" : "— بدون مقطع بداية"}</span><span>{question.full_audio_path ? "✓ مقطع كامل" : "— بدون مقطع كامل"}</span><span>جاوبوا عليه: {question.answersCount}</span></div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}><button className="btn btn-outline" style={{ width: "auto", padding: "8px 14px", fontSize: 13 }} onClick={() => beginSongEdit(question)} disabled={songActionId === question.id}>✎ تعديل السؤال والصوت</button><button className={question.is_active ? "btn btn-outline" : "btn btn-gold"} style={{ width: "auto", padding: "8px 14px", fontSize: 13 }} onClick={() => void toggleSong(question)} disabled={songActionId === question.id}>{songActionId === question.id ? "..." : question.is_active ? "وقف السؤال" : "فعّل السؤال"}</button><button className="btn btn-danger" style={{ width: "auto", padding: "8px 14px", fontSize: 13 }} onClick={() => void deleteSong(question)} disabled={songActionId === question.id}>حذف</button></div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {editingSong && (
          <div className="song-edit-overlay" role="dialog" aria-modal="true" aria-label="تعديل سؤال كمل الأغنية">
            <div className="song-edit-modal">
              <div className="song-edit-modal-head"><div><span className="song-eyebrow">تعديل سؤال موجود</span><h3>✎ {editingSong.title}</h3></div><button type="button" className="song-edit-close" onClick={closeSongEdit} disabled={editSongBusy} aria-label="إغلاق">×</button></div>
              {songError && <div className="error-text">{songError}</div>}
              <div className="field"><label>اسم الأغنية أو عنوان داخلي</label><input className="input" value={editSongTitle} maxLength={120} onChange={(e) => setEditSongTitle(e.target.value)} /></div>
              <div className="field"><label>السطر قبل الإجابة</label><textarea className="input song-admin-textarea" value={editSongPrompt} maxLength={500} onChange={(e) => setEditSongPrompt(e.target.value)} /><small className="muted">خلي علامة «…» مكان الجزء الناقص.</small></div>
              <div className="field"><label>الجملة الكاملة بعد الإجابة</label><textarea className="input song-admin-textarea" value={editSongFullLine} maxLength={700} onChange={(e) => setEditSongFullLine(e.target.value)} /></div>
              {editSongOptions.map((option, index) => (
                <div className="field" key={index}><label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="radio" name="editSongCorrect" checked={editSongCorrect === index} onChange={() => setEditSongCorrect(index)} /> اختيار {index + 1} {editSongCorrect === index ? "(الإجابة الصح)" : ""}</label><input className="input" value={option} maxLength={160} onChange={(e) => { const copy = [...editSongOptions]; copy[index] = e.target.value; setEditSongOptions(copy); }} /></div>
              ))}
              <div className="song-current-audio">
                <label className={editingSong.intro_audio_path ? "has-audio" : ""}><input type="checkbox" checked={editRemoveIntro} disabled={!editingSong.intro_audio_path || Boolean(editSongIntroFile)} onChange={(e) => setEditRemoveIntro(e.target.checked)} /> {editSongIntroFile ? "هيتم استبدال مقطع البداية الجديد" : editingSong.intro_audio_path ? "مقطع البداية الحالي موجود — علّم هنا لإزالته" : "لا يوجد مقطع بداية محفوظ"}</label>
                <label className={editingSong.full_audio_path ? "has-audio" : ""}><input type="checkbox" checked={editRemoveFull} disabled={!editingSong.full_audio_path || Boolean(editSongFullFile)} onChange={(e) => setEditRemoveFull(e.target.checked)} /> {editSongFullFile ? "هيتم استبدال مقطع بعد الإجابة" : editingSong.full_audio_path ? "المقطع الكامل الحالي موجود — علّم هنا لإزالته" : "لا يوجد مقطع كامل محفوظ"}</label>
              </div>
              <div className="song-admin-audio-grid">
                <div className="field"><label>استبدل مقطع البداية مباشرة (اختياري)</label><input key={`edit-intro-${editSongFileReset}`} className="input" type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/ogg" onChange={(e) => { setEditSongIntroFile(e.target.files?.[0] || null); setEditRemoveIntro(false); }} /></div>
                <div className="field"><label>استبدل مقطع بعد الإجابة مباشرة (اختياري)</label><input key={`edit-full-${editSongFileReset}`} className="input" type="file" accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/aac,audio/ogg" onChange={(e) => { setEditSongFullFile(e.target.files?.[0] || null); setEditRemoveFull(false); }} /></div>
              </div>
              <SongAudioClipEditor key={`edit-clip-${editSongFileReset}`} introFile={editSongIntroFile} fullFile={editSongFullFile} onIntroFile={(file) => { setEditSongIntroFile(file); if (file) setEditRemoveIntro(false); }} onFullFile={(file) => { setEditSongFullFile(file); if (file) setEditRemoveFull(false); }} saveHint="بعد كده اضغط «احفظ التعديلات»؛ وقتها المقطع هيرتفع ويتربط بالسؤال." disabled={editSongBusy} />
              <div className="song-edit-actions"><button type="button" className="btn btn-outline" onClick={closeSongEdit} disabled={editSongBusy}>إلغاء</button><ShakeButton className="btn btn-gold" onClick={saveSongEdit} disabled={editSongBusy}>{editSongBusy ? "جاري حفظ التعديل…" : "احفظ التعديلات"}</ShakeButton></div>
            </div>
          </div>
        )}

        {tab === "pictionaryWords" && (
          <>
            <div className="card" style={{ marginBottom: 22 }}>
              <h3 style={{ marginTop: 0 }}>بنك كلمات ارسم واتقال</h3>
              <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>اكتب كلمات كثيرة هنا. في كل جولة، اللعبة تسحب 3 كلمات عشوائية من البنك عشان الرسّام يختار واحدة. لازم يبقى عندك 3 كلمات على الأقل.</p>
              {pictionaryError && <div className="error-text">{pictionaryError}</div>}
              <div className="field">
                <label>كلمة جديدة</label>
                <input className="input" value={pictionaryWord} maxLength={48} placeholder="مثال: عربية، شجرة، كتاب" onChange={(e) => setPictionaryWord(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void createPictionaryWord(); }} />
              </div>
              <ShakeButton className="btn btn-gold" onClick={createPictionaryWord} disabled={pictionaryBusy}>{pictionaryBusy ? "جاري الإضافة..." : "أضف الكلمة للبنك"}</ShakeButton>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>الكلمات الحالية ({pictionaryWords.length})</h3>
              <input className="input" style={{ width: "min(300px, 100%)" }} value={pictionarySearch} placeholder="ابحث عن كلمة..." onChange={(e) => setPictionarySearch(e.target.value)} />
            </div>
            {pictionaryLoading ? (
              <div className="card empty">جاري تحميل بنك الكلمات...</div>
            ) : pictionaryWords.filter((item) => item.word.includes(pictionarySearch.trim())).length === 0 ? (
              <div className="card empty">مفيش كلمات مطابقة. ضيف كلمات عشان اللعبة تختار منها.</div>
            ) : (
              <div className="list">
                {pictionaryWords.filter((item) => item.word.includes(pictionarySearch.trim())).map((item) => (
                  <div className="card card-tight" key={item.id}>
                    <div className="row" style={{ background: "transparent", border: "none", padding: 0 }}>
                      <div><div style={{ fontWeight: 800, fontSize: 16 }}>{item.word}</div><div className="muted" style={{ fontSize: 12, marginTop: 4 }}>اتضافت {new Date(item.created_at).toLocaleDateString("ar-EG")}</div></div>
                      <button className="btn btn-danger" style={{ width: "auto", padding: "8px 14px", fontSize: 13 }} onClick={() => deletePictionaryWord(item.id, item.word)} disabled={pictionaryDeleteId === item.id}>{pictionaryDeleteId === item.id ? "جاري الحذف..." : "حذف"}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
