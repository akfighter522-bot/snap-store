import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, ArrowLeft } from "lucide-react";
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
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
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

  // Group messages by person
  const conversations = notes?.reduce((acc, note) => {
    if (!acc[note.title]) {
      acc[note.title] = [];
    }
    acc[note.title].push(note);
    return acc;
  }, {} as Record<string, Note[]>);

  // Get conversation list with latest message
  const conversationList = Object.entries(conversations || {}).map(([person, messages]) => {
    const latestMessage = messages[messages.length - 1];
    return {
      person,
      latestMessage: latestMessage.content,
      time: latestMessage.created_at,
      messageCount: messages.length
    };
  }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  useEffect(() => {
    if (selectedPerson) {
      scrollToBottom();
    }
  }, [notes, selectedPerson]);

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
    const personName = selectedPerson || title.trim();
    if (!personName || !message.trim()) return;
    createMutation.mutate({ title: personName, content: message.trim() });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", { 
        hour: "numeric", 
        minute: "2-digit",
        hour12: true 
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  const selectedMessages = selectedPerson ? conversations?.[selectedPerson] : null;

  return (
    <div className="flex flex-col h-[600px] bg-background border border-border rounded-lg shadow-soft">
      {!selectedPerson ? (
        // Conversation List View
        <>
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading conversations...</div>
            ) : conversationList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No conversations yet. Start a new one!</p>
              </div>
            ) : (
              conversationList.map(({ person, latestMessage, time }) => (
                <div
                  key={person}
                  onClick={() => setSelectedPerson(person)}
                  className="flex items-center gap-3 p-4 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-semibold text-primary">
                      {person.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-foreground truncate">{person}</h3>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {formatTime(time)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{latestMessage}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        // Individual Chat View
        <>
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedPerson(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-base font-semibold text-primary">
                {selectedPerson.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">{selectedPerson}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedMessages?.map((note) => (
              <div key={note.id} className="flex flex-col gap-1 group">
                <div className="bg-primary/10 rounded-2xl rounded-tl-sm px-4 py-2 inline-block max-w-[80%]">
                  <p className="text-foreground break-words">{note.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(note.created_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteMutation.mutate(note.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </>
      )}

      <div className="p-4 border-t border-border">
        <div className="space-y-2">
          {!selectedPerson && (
            <Input
              placeholder="Person name..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
          )}
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
              disabled={(!selectedPerson && !title.trim()) || !message.trim() || createMutation.isPending}
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
