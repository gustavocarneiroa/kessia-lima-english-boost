import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ExternalLink, Loader2, MessageSquare, Send, X } from "lucide-react";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 20;

export interface ForumPost {
  id: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  authorName: string;
  isMine: boolean;
  commentCount: number;
}

export function formatForumDate(iso: string, locale = "pt-BR") {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function linkHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function Forum() {
  const { user } = useAuth();
  const { t, locale } = usePortalPrefs();
  const isTeacher = user?.role === "teacher";
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [pending, setPending] = useState<ForumPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [res, pend] = await Promise.all([
        api.get<{ items: ForumPost[]; total: number }>(`/api/forum/posts?page=${page}&pageSize=${PAGE_SIZE}`),
        api.get<ForumPost[]>("/api/forum/pending"),
      ]);
      setPosts(res.items);
      setTotal(res.total);
      setPending(pend);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api.post("/api/forum/posts", { title, body, linkUrl });
      setTitle("");
      setBody("");
      setLinkUrl("");
      setNotice(
        isTeacher
          ? t("Publicado! Os alunos já podem ver.", "Published! Students can see it now.")
          : t(
              "Enviado! Sua publicação vai aparecer para a turma assim que a professora aprovar.",
              "Sent! Your post will show up for the class as soon as the teacher approves it.",
            ),
      );
      if (page !== 1) setPage(1);
      else await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível publicar.", "Couldn't publish."));
    } finally {
      setSaving(false);
    }
  }

  async function approve(id: string) {
    setActingOn(id);
    try {
      await api.post(`/api/forum/posts/${id}/approve`);
      await load();
    } finally {
      setActingOn(null);
    }
  }

  async function remove(id: string) {
    setActingOn(id);
    try {
      await api.delete(`/api/forum/posts/${id}`);
      await load();
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Fórum", "Forum")}</h1>
        <p className="text-muted-foreground">
          {isTeacher
            ? t(
                "Compartilhe artigos e links com a turma. O que os alunos enviam passa pela sua aprovação.",
                "Share articles and links with the class. Anything students send goes through your approval.",
              )
            : t(
                "Leia o que a professora e a turma compartilharam, comente e sugira coisas legais.",
                "Read what your teacher and classmates shared, comment, and suggest cool stuff.",
              )}
        </p>
      </div>

      {pending.length > 0 && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">
              {isTeacher
                ? t("Aguardando sua aprovação", "Waiting for your approval")
                : t("Suas publicações aguardando aprovação", "Your posts waiting for approval")}
            </CardTitle>
            <CardDescription>
              {isTeacher
                ? t(
                    "Só aparecem para a turma depois que você aprovar. Recusar apaga a publicação.",
                    "They only show up for the class after you approve them. Rejecting deletes the post.",
                  )
                : t(
                    "A professora vai dar uma olhada antes de publicar para a turma.",
                    "Your teacher will take a look before publishing it to the class.",
                  )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {pending.map((p) => (
                <li key={p.id} className="space-y-2 rounded-md border bg-background p-3">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.authorName} · {formatForumDate(p.createdAt, locale)}
                    </p>
                  </div>
                  {p.body && <p className="whitespace-pre-wrap text-sm">{p.body}</p>}
                  {p.linkUrl && (
                    <a
                      href={p.linkUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 break-all text-sm text-primary hover:underline"
                    >
                      {p.linkUrl} <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {isTeacher && (
                      <Button size="sm" className="gap-1" disabled={actingOn === p.id} onClick={() => approve(p.id)}>
                        {actingOn === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        {t("Aprovar", "Approve")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={actingOn === p.id}
                      onClick={() => remove(p.id)}
                    >
                      <X className="h-4 w-4" />
                      {isTeacher ? t("Recusar", "Reject") : t("Cancelar envio", "Cancel submission")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isTeacher ? t("Nova publicação", "New post") : t("Compartilhar algo", "Share something")}
          </CardTitle>
          {!isTeacher && (
            <CardDescription>
              {t(
                "Um artigo, vídeo, música ou dica. A professora aprova antes de aparecer.",
                "An article, video, song or tip. Your teacher approves it before it shows up.",
              )}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="forum-title">{t("Título", "Title")}</Label>
              <Input
                id="forum-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="forum-body">{t("Texto (opcional)", "Text (optional)")}</Label>
              <Textarea
                id="forum-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={5000}
                rows={4}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="forum-link">{t("Link (opcional)", "Link (optional)")}</Label>
              <Input
                id="forum-link"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isTeacher ? t("Publicar", "Publish") : t("Enviar para aprovação", "Send for approval")}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {notice && <p className="text-sm text-primary">{notice}</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("Publicações", "Posts")}</CardTitle>
          <CardDescription>{total} {t("publicação(ões)", "post(s)")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("Nada publicado ainda.", "Nothing posted yet.")}</p>
          ) : (
            <ul className="space-y-2">
              {posts.map((p) => (
                <li key={p.id}>
                  <Link to={`/portal/forum/${p.id}`} className="block rounded-md border px-3 py-2 hover:bg-muted/50">
                    <p className="font-medium">{p.title}</p>
                    {p.body && <p className="line-clamp-2 text-sm text-muted-foreground">{p.body}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {p.authorName} · {formatForumDate(p.publishedAt ?? p.createdAt, locale)}
                      </span>
                      {p.linkUrl && (
                        <Badge variant="outline" className="gap-1 font-normal">
                          <ExternalLink className="h-3 w-3" /> {linkHost(p.linkUrl)}
                        </Badge>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {p.commentCount}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
