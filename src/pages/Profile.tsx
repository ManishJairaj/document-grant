import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { User, Save } from "lucide-react";

const Profile = () => {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [name, setName] = useState("");
  const [level, setLevel] = useState("beginner");
  const [style, setStyle] = useState("simple");
  const [domain, setDomain] = useState("general");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setLevel(profile.experience_level);
      setStyle(profile.explanation_style);
      setDomain(profile.preferred_domain || "general");
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({
        name,
        experience_level: level,
        explanation_style: style,
        preferred_domain: domain,
      });
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <DashboardLayout><div className="animate-pulse-gentle text-muted-foreground">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl mx-auto"
      >
        <h1 className="text-3xl font-display font-bold text-foreground mb-8 flex items-center gap-3">
          <User className="w-7 h-7 text-primary" /> Your Profile
        </h1>

        <Card className="shadow-card">
          <CardHeader><CardTitle className="font-display">Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="text-foreground">Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label className="text-foreground">Experience Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground">Explanation Style</Label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple & Clear</SelectItem>
                  <SelectItem value="detailed">In-depth</SelectItem>
                  <SelectItem value="visual">Visual</SelectItem>
                  <SelectItem value="examples">Examples-first</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground">Preferred Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="programming">Programming</SelectItem>
                  <SelectItem value="data-science">Data Science</SelectItem>
                  <SelectItem value="finance">Financial Literacy</SelectItem>
                  <SelectItem value="science">Science</SelectItem>
                  <SelectItem value="math">Mathematics</SelectItem>
                  <SelectItem value="career">Career Development</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleSave} disabled={updateProfile.isPending} className="gradient-primary text-primary-foreground">
              <Save className="w-4 h-4 mr-2" /> {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
