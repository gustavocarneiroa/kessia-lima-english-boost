import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePortalPrefs } from "@/contexts/PortalPrefsContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ExternalLink, Loader2, Send, Trash2 } from "lucide-react";
import { formatForumDate, type ForumPost as ForumPostSummary } from "./Forum";

interface ForumComment {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  isMine: boolean;
}

interface ForumPostDetail extends ForumPostSummary {
  comments: ForumComment[];
}

export default function ForumPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, locale } = usePortalPrefs();
  const isTeacher = user?.role === "teacher";
  const [post, setPost] = useState<ForumPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setPost(await api.get<ForumPostDetail>(`/api/forum/posts/${id}`));
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.post(`/api/forum/posts/${id}/comments`, { body: comment });
      setComment("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Não foi possível enviar o comentário.", "Couldn't send the comment."));
    } finally {
      setSending(false);
    }
  }

  async function removeComment(commentId: string) {
    await api.delete(`/api/forum/comments/${commentId}`);
    await load();
  }

  async function removePost() {
    setDeleting(true);
    try {
      await api.delete(`/api/forum/posts/${id}`);
      navigate("/portal/forum");
    } finally {
      setDeleting(false);
    }
  }

  const back = (
    <Button asChild variant="ghost" size="sm" className="gap-1 px-2">
      <Link to="/portal/forum">
        <ArrowLeft className="h-4 w-4" /> {t("Fórum", "Forum")}
      </Link>
    </Button>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-muted-foreground">{t("Essa publicação não existe mais.", "This post no longer exists.")}</p>
      </div>
    );
  }

  const canDeletePost = isTeacher || post.isMine;

  return (
    <div className="space-y-6">
      {back}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-xl">{post.title}</CardTitle>
              <CardDescription>
                {post.authorName} · {formatForumDate(post.publishedAt ?? post.createdAt, locale)}
              </CardDescription>
              {!post.publishedAt && <Badge variant="outline">{t("Aguardando aprovação", "Waiting for approval")}</Badge>}
            </div>
            {canDeletePost && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground"
                onClick={() => setConfirmDeletePost(true)}
                aria-label={t("Excluir publicação", "Delete post")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {post.body && <p className="whitespace-pre-wrap">{post.body}</p>}
          {post.linkUrl && (
            <a
              href={post.linkUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 break-all text-primary hover:underline"
            >
              {post.linkUrl} <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          )}
        </CardContent>
      </Card>

      {post.publishedAt && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("Comentários", "Comments")} ({post.comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {post.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("Ninguém comentou ainda. Seja o primeiro!", "No comments yet. Be the first!")}
              </p>
            ) : (
              <ul className="divide-y">
                {post.comments.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.authorName}</span> ·{" "}
                        {formatForumDate(c.createdAt, locale)}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                    {(isTeacher || c.isMine) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground"
                        onClick={() => removeComment(c.id)}
                        aria-label={t("Apagar comentário", "Delete comment")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={sendComment} className="space-y-2">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("Escreva um comentário...", "Write a comment...")}
                maxLength={2000}
                rows={3}
                required
              />
              <Button type="submit" size="sm" disabled={sending || !comment.trim()} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t("Comentar", "Comment")}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmDeletePost} onOpenChange={setConfirmDeletePost}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Excluir esta publicação?", "Delete this post?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                `"${post.title}" e todos os comentários dela serão apagados. Essa ação não pode ser desfeita.`,
                `"${post.title}" and all its comments will be deleted. This can't be undone.`,
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("Cancelar", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={removePost} disabled={deleting} className="gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("Excluir", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
