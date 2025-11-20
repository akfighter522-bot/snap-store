import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, FileText } from "lucide-react";
import { ChatMessages } from "./ChatMessages";
import { NotesCards } from "./NotesCards";

export const NotesList = () => {
  return (
    <Tabs defaultValue="chat" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="chat" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Chat Messages
        </TabsTrigger>
        <TabsTrigger value="notes" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Full Notes
        </TabsTrigger>
      </TabsList>
      <TabsContent value="chat" className="mt-4">
        <ChatMessages />
      </TabsContent>
      <TabsContent value="notes" className="mt-4">
        <NotesCards />
      </TabsContent>
    </Tabs>
  );
};
