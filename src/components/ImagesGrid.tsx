import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Image as ImageIcon, Download } from "lucide-react";

type FileUpload = {
  id: string;
  file_name: string;
  storage_path: string;
  created_at: string;
};

export const ImagesGrid = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: images, isLoading } = useQuery({
    queryKey: ["images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("file_uploads")
        .select("*")
        .eq("category", "image")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as FileUpload[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("file_uploads").insert({
        user_id: user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: filePath,
        category: "image",
      });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Image uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (image: FileUpload) => {
      const { error: storageError } = await supabase.storage
        .from("images")
        .remove([image.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("file_uploads")
        .delete()
        .eq("id", image.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["images"] });
      toast({ title: "Image deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    await uploadMutation.mutateAsync(file);
    setUploading(false);
    e.target.value = "";
  };

  const getImageUrl = (path: string) => {
    const { data } = supabase.storage.from("images").getPublicUrl(path);
    return data.publicUrl;
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading images...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Your Images</h2>
        <Button disabled={uploading} asChild>
          <label className="cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : "Upload Image"}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </Button>
      </div>

      {images && images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {images.map((image) => (
            <Card key={image.id} className="shadow-soft hover:shadow-medium transition-shadow overflow-hidden group">
              <CardContent className="p-0 relative aspect-square max-h-48">
                <img
                  src={getImageUrl(image.storage_path)}
                  alt={image.file_name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => deleteMutation.mutate(image)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    asChild
                  >
                    <a
                      href={getImageUrl(image.storage_path)}
                      download={image.file_name}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-white text-sm truncate">{image.file_name}</p>
                  <p className="text-white/70 text-xs">
                    {new Date(image.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-soft">
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No images yet. Upload your first image!</p>
            <Button asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
