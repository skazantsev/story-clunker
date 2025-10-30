import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, PenTool, LogOut, Plus } from "lucide-react";
import StoryList from "@/components/StoryList";
import StoryBuilder from "@/components/StoryBuilder";
import NewStoryDialog from "@/components/NewStoryDialog";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isNewStoryOpen, setIsNewStoryOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "Come back soon!",
    });
  };

  const handleStoryCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center">
              <PenTool className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Story Weaver
              </h1>
              <p className="text-sm text-muted-foreground">AI-Powered Storytelling</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </header>

        {/* Main Content */}
        {selectedStoryId ? (
          <StoryBuilder
            storyId={selectedStoryId}
            onBack={() => setSelectedStoryId(null)}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Your Stories</h2>
              <Button onClick={() => setIsNewStoryOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Story
              </Button>
            </div>
            
            <StoryList 
              onSelectStory={setSelectedStoryId}
              refreshTrigger={refreshTrigger}
            />
          </>
        )}

        {/* New Story Dialog */}
        <NewStoryDialog
          open={isNewStoryOpen}
          onOpenChange={setIsNewStoryOpen}
          onStoryCreated={handleStoryCreated}
        />
      </div>
    </div>
  );
};

export default Index;
