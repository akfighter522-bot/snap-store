import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2 } from "lucide-react";
import { z } from "zod";

const noteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title too long"),
  content: z.string().trim().min(1, "Message is required").max(500, "Message too long"),
});

type Note = {
  id: string;
  title: string;
  content: string | null;
  created_at: string;
};

export const ChatMessages = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const { data: notes, isLoading } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as Note[];
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [notes]);

  const createMutation = useMutation({
    mutationFn: async (newNote: { title: string; content: string }) => {
      const validation = noteSchema.safeParse(newNote);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notes")
        .insert({ title: newNote.title, content: newNote.content, user_id: user.id });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setTitle("");
      setMessage("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;
    createMutation.mutate({ title: title.trim(), content: message.trim() });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };

  return (
    <div className="flex flex-col h-[600px] bg-background border border-border rounded-lg shadow-soft">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
        ) : notes?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          notes?.map((note) => (
            <div key={note.id} className="flex items-start gap-3 group">
              <div className="flex-1">
                <div className="bg-primary/10 rounded-2xl rounded-tl-sm px-4 py-3 inline-block max-w-[80%]">
                  <p className="text-sm font-semibold text-foreground mb-1">{note.title}</p>
                  <p className="text-foreground break-words">{note.content}</p>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-1">
                  <span className="text-xs text-muted-foreground">
                    {formatTime(note.created_at)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteMutation.mutate(note.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="space-y-2">
          <Input
            placeholder="Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button 
              onClick={handleSend}
              disabled={!title.trim() || !message.trim() || createMutation.isPending}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
