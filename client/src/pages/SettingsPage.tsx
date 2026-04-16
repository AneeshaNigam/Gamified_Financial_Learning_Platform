/** @format */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/services/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
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
import { Eye, EyeOff, Lock } from "lucide-react";

// Change Password Component
function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (pwd: string): boolean => {
    const minLength = pwd.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(pwd);
    return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  };

  const getPasswordStrength = (pwd: string): string => {
    if (pwd.length === 0) return "";
    if (!validatePassword(pwd)) return "weak";
    if (pwd.length >= 12) return "strong";
    return "medium";
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!validatePassword(newPassword)) {
      toast.error(
        "New password must be at least 8 characters with uppercase, lowercase, number, and special character"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      toast.success("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <form onSubmit={handleChangePassword} className="space-y-4">
      <div>
        <Label htmlFor="currentPassword">Current Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            className="pl-10 pr-10"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            className="pl-10 pr-10"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {newPassword && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              <div
                className={`h-1 flex-1 rounded ${
                  strength === "weak"
                    ? "bg-red-500"
                    : strength === "medium"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
              />
              {strength !== "weak" && (
                <div
                  className={`h-1 flex-1 rounded ${
                    strength === "strong" ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
              )}
              {strength === "strong" && (
                <div className="h-1 flex-1 rounded bg-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Password strength:{" "}
              <span
                className={
                  strength === "weak"
                    ? "text-red-500"
                    : strength === "medium"
                    ? "text-yellow-500"
                    : "text-green-500"
                }
              >
                {strength}
              </span>
            </p>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="pl-10 pr-10"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Changing Password..." : "Change Password"}
      </Button>
    </form>
  );
}


export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.name || "",
    school: user?.school || "",
    grade: user?.grade || "",
  });
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    showOnLeaderboard: true,
    allowBattles: true,
    soundEffects: true,
    animations: true,
  });

  const handleSave = async () => {
    try {
      await updateUser(formData);
      toast.success("Profile updated successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleToggle = (key: string) => {
    setSettings({ ...settings, [key]: !settings[key] });
    toast.success("Settings updated!");
  };

  const handleReset = () => {
    logout();
    toast.success("Logged out. Please login again.");
    navigate("/login");
  };

  const handleDelete = () => {
    logout();
    toast.success("Account deleted.");
    navigate("/");
  };

  const handleExport = () => {
    const data = { user };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moneymaster-data-${Date.now()}.json`;
    a.click();
    toast.success("Data exported!");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Email cannot be changed
            </p>
          </div>
          <div>
            <Label htmlFor="school">School/College</Label>
            <Input
              id="school"
              value={formData.school}
              onChange={(e) =>
                setFormData({ ...formData, school: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="grade">Grade/Class</Label>
            <Select
              value={formData.grade}
              onValueChange={(value) =>
                setFormData({ ...formData, grade: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5th">5th Grade</SelectItem>
                <SelectItem value="6th">6th Grade</SelectItem>
                <SelectItem value="7th">7th Grade</SelectItem>
                <SelectItem value="8th">8th Grade</SelectItem>
                <SelectItem value="9th">9th Grade</SelectItem>
                <SelectItem value="10th">10th Grade</SelectItem>
                <SelectItem value="11th">11th Grade</SelectItem>
                <SelectItem value="12th">12th Grade</SelectItem>
                <SelectItem value="College 1st">College 1st Year</SelectItem>
                <SelectItem value="College 2nd">College 2nd Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Security</h2>
        <ChangePasswordForm />
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive updates via email
              </p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={() => handleToggle("emailNotifications")}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get push notifications
              </p>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={() => handleToggle("pushNotifications")}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Privacy</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show on Leaderboard</Label>
              <p className="text-sm text-muted-foreground">
                Appear in public rankings
              </p>
            </div>
            <Switch
              checked={settings.showOnLeaderboard}
              onCheckedChange={() => handleToggle("showOnLeaderboard")}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Allow Battle Challenges</Label>
              <p className="text-sm text-muted-foreground">
                Let others challenge you
              </p>
            </div>
            <Switch
              checked={settings.allowBattles}
              onCheckedChange={() => handleToggle("allowBattles")}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">App Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Sound Effects</Label>
              <p className="text-sm text-muted-foreground">
                Play sound effects
              </p>
            </div>
            <Switch
              checked={settings.soundEffects}
              onCheckedChange={() => handleToggle("soundEffects")}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Animations</Label>
              <p className="text-sm text-muted-foreground">Show animations</p>
            </div>
            <Switch
              checked={settings.animations}
              onCheckedChange={() => handleToggle("animations")}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Data Management</h2>
        <div className="space-y-3">
          <Button onClick={handleExport} variant="outline" className="w-full">
            Download My Data
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full text-danger border-danger hover:bg-danger hover:text-white"
              >
                Reset Progress
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all your progress, achievements,
                  stocks, and wallet balance. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-danger text-white hover:bg-danger/90"
                >
                  Reset Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all associated
                  data. You cannot undo this action.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-danger text-white hover:bg-danger/90"
                >
                  Delete Forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">About</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Version:</strong> 1.0.0
          </p>
          <p>
            <strong>Created:</strong> 2024
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="link" className="px-0">
              Terms of Service
            </Button>
            <Button variant="link" className="px-0">
              Privacy Policy
            </Button>
            <Button variant="link" className="px-0">
              Help Center
            </Button>
          </div>
        </div>
      </Card>

      <Button onClick={logout} variant="outline" className="w-full" size="lg">
        Logout
      </Button>
    </div>
  );
}
