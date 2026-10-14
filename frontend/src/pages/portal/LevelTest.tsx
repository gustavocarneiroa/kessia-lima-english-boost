import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LEVEL_TEST_FOR_STUDENTS } from "@/lib/levelTest";
import LevelTestTeacher from "./LevelTestTeacher";
import LevelTestTake from "./LevelTestTake";

// /portal/teste-de-nivel — a professora libera o teste e edita as perguntas; o aluno faz.
export default function LevelTest() {
  const { user } = useAuth();
  if (user?.role === "teacher") return <LevelTestTeacher />;
  if (!LEVEL_TEST_FOR_STUDENTS) return <Navigate to="/portal" replace />;
  return <LevelTestTake />;
}
