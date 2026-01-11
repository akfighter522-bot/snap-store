import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthGuard } from "@/components/AuthGuard";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ArrowLeft, Shield, FileText, Image, Users, Loader2 } from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string | null;
  user_id: string;
  created_at: string;
}

interface FileUpload {
  id: string;
  file_name: string;
  file_type: string;
  category: string;
  user_id: string;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

const AdminPanel = () => {
  const { isAdmin, isLoading: roleLoading } = useAdminRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access the admin panel.",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [notesRes, filesRes, profilesRes] = await Promise.all([
        supabase.from("notes").select("*").order("created_at", { ascending: false }),
        supabase.from("file_uploads").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);

      if (notesRes.data) setNotes(notesRes.data);
      if (filesRes.data) setFiles(filesRes.data);
      if (profilesRes.data) setProfiles(profilesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
    } else {
      setNotes(notes.filter((n) => n.id !== id));
      toast({ title: "Success", description: "Note deleted successfully" });
    }
  };

  const handleDeleteFile = async (id: string, storagePath?: string) => {
    // First delete from storage if path exists
    if (storagePath) {
      await supabase.storage.from("images").remove([storagePath]);
      await supabase.storage.from("documents").remove([storagePath]);
    }

    const { error } = await supabase.from("file_uploads").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete file", variant: "destructive" });
    } else {
      setFiles(files.filter((f) => f.id !== id));
      toast({ title: "Success", description: "File deleted successfully" });
    }
  };

  const handleDeleteUser = async (userId: string, profileId: string) => {
    // Delete profile (cascade will handle related data via RLS)
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", profileId);
    
    if (profileError) {
      toast({ title: "Error", description: "Failed to delete user profile", variant: "destructive" });
    } else {
      setProfiles(profiles.filter((p) => p.id !== profileId));
      // Also remove related notes and files from local state
      setNotes(notes.filter((n) => n.user_id !== userId));
      setFiles(files.filter((f) => f.user_id !== userId));
      toast({ title: "Success", description: "User profile deleted successfully" });
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.id.includes(searchTerm)
  );

  const filteredFiles = files.filter(
    (f) =>
      f.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.id.includes(searchTerm)
  );

  const filteredProfiles = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.includes(searchTerm) ||
      p.user_id.includes(searchTerm)
  );

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-accent/5">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold">Admin Panel</h1>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
              <CardDescription>Search by ID, name, or title across all records</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by ID or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </CardContent>
          </Card>

          <Tabs defaultValue="notes" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes ({filteredNotes.length})
              </TabsTrigger>
              <TabsTrigger value="files" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Files ({filteredFiles.length})
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users ({filteredProfiles.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notes">
              <Card>
                <CardHeader>
                  <CardTitle>All Notes</CardTitle>
                  <CardDescription>Manage notes from all users</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredNotes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No notes found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredNotes.map((note) => (
                          <TableRow key={note.id}>
                            <TableCell className="font-mono text-xs">{note.id.slice(0, 8)}...</TableCell>
                            <TableCell className="font-medium">{note.title}</TableCell>
                            <TableCell className="font-mono text-xs">{note.user_id.slice(0, 8)}...</TableCell>
                            <TableCell>{new Date(note.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Note</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{note.title}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteNote(note.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files">
              <Card>
                <CardHeader>
                  <CardTitle>All Files</CardTitle>
                  <CardDescription>Manage file uploads from all users</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredFiles.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No files found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>File Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFiles.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell className="font-mono text-xs">{file.id.slice(0, 8)}...</TableCell>
                            <TableCell className="font-medium">{file.file_name}</TableCell>
                            <TableCell>{file.file_type}</TableCell>
                            <TableCell className="capitalize">{file.category}</TableCell>
                            <TableCell className="font-mono text-xs">{file.user_id.slice(0, 8)}...</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete File</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{file.file_name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteFile(file.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>Manage user profiles</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredProfiles.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No users found</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profile ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProfiles.map((profile) => (
                          <TableRow key={profile.id}>
                            <TableCell className="font-mono text-xs">{profile.id.slice(0, 8)}...</TableCell>
                            <TableCell className="font-medium">{profile.name}</TableCell>
                            <TableCell className="font-mono text-xs">{profile.user_id.slice(0, 8)}...</TableCell>
                            <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User Profile</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete the profile for "{profile.name}"? This will remove their profile data. Note: Their auth account will remain.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteUser(profile.user_id, profile.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthGuard>
  );
};

export default AdminPanel;
