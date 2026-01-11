import { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  Menu,
  LogOut,
  ArrowLeft,
  Eye,
  EyeOff,
  Edit2,
  X,
  Download,
  Users,
  Upload,
  AlertTriangle,
  FileText,
  CheckCircle,
  DollarSign,
  Link2,
  Calendar as CalendarIcon,
  ExternalLink,
  Image as ImageIcon,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import OrganizationsPage from "@/components/OrganizationsPage";
import SubmissionsPage from "@/components/SubmissionsPage";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

// Deadline Appeal Section Component
const DeadlineAppealSection = ({ deadlineType, eventId, orgShortName, targetOrg, appealApproved }: { deadlineType: 'accomplishment' | 'liquidation', eventId: string, orgShortName: string, targetOrg?: string, appealApproved?: boolean }) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealFile, setAppealFile] = useState<File | null>(null);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [targetOrgAppealSubmitted, setTargetOrgAppealSubmitted] = useState(false);
  const { toast } = useToast();

  const reportType = deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation';

  // Check if appeal was already submitted for this specific event (own org)
  useEffect(() => {
    const checkAppealStatus = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id')
        .eq('organization', orgShortName)
        .eq('submission_type', 'Letter of Appeal')
        .ilike('activity_title', `%${reportType}%`)
        .limit(1);
      
      setAppealSubmitted(!!data && data.length > 0);
    };
    checkAppealStatus();
  }, [orgShortName, reportType]);

  // Check if appeal was submitted by target organization (for LCO viewing AO appeals, USG viewing LSG appeals)
  useEffect(() => {
    const checkTargetOrgAppealStatus = async () => {
      if (!targetOrg || targetOrg === orgShortName) return;
      
      // LCO checks for AO appeals, USG checks for LSG appeals
      let submittedToOrg = '';
      if (orgShortName === 'LCO' && targetOrg === 'AO') {
        submittedToOrg = 'LCO';
      } else if (orgShortName === 'USG' && targetOrg === 'LSG') {
        submittedToOrg = 'USG';
      }
      
      if (!submittedToOrg) return;
      
      const { data } = await supabase
        .from('submissions')
        .select('id')
        .eq('submission_type', 'Letter of Appeal')
        .ilike('activity_title', `%${reportType}%`)
        .eq('submitted_to', submittedToOrg)
        .limit(1);
      
      setTargetOrgAppealSubmitted(!!data && data.length > 0);
    };
    checkTargetOrgAppealStatus();
  }, [orgShortName, targetOrg, reportType]);
  
  // Determine if this is the org's own deadline (can submit appeal) or just a notification
  // All orgs can submit appeal for their own events
  // LCO sees AO events just for notification, USG sees LSG events just for notification
  const isOwnDeadline = targetOrg === orgShortName;
  const canSubmitAppeal = isOwnDeadline;

  const [notificationSent, setNotificationSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNotifyOrganization = async () => {
    // Send notification to the target organization
    if (targetOrg) {
      await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          event_title: `Reminder: ${reportType} Report Due Today`,
          event_description: `${orgShortName} is reminding you that today is the deadline for the submission of ${reportType} report.`,
          created_by: orgShortName,
          target_org: targetOrg
        });
      setNotificationSent(true);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealFile) return;
    
    setSubmitting(true);
    try {
      // Determine where to submit based on organization
      let submittedTo = 'OSLD'; // Default for LCO, USG, USED, GSC, TGP
      if (orgShortName === 'AO') {
        submittedTo = 'LCO';
      } else if (orgShortName === 'LSG') {
        submittedTo = 'USG';
      }

      // Upload file to storage
      const fileExt = appealFile.name.split('.').pop();
      const storagePath = `${orgShortName}_appeal_${Date.now()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('submissions')
        .upload(storagePath, appealFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('submissions')
        .getPublicUrl(storagePath);

      // Insert submission record
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          organization: orgShortName,
          submission_type: 'Letter of Appeal',
          activity_title: `Letter of Appeal - ${reportType} Report`,
          activity_duration: 'N/A',
          activity_venue: 'N/A',
          activity_participants: 'N/A',
          activity_funds: 'N/A',
          activity_budget: 'N/A',
          activity_sdg: 'N/A',
          activity_likha: 'N/A',
          file_url: publicUrl,
          file_name: appealFile.name,
          status: 'Pending',
          submitted_to: submittedTo
        });

      if (insertError) throw insertError;

      // Send notification to the receiving organization
      await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          event_title: `Letter of Appeal Submitted`,
          event_description: `${orgShortName} has submitted a Letter of Appeal for ${reportType} Report. Please review it.`,
          created_by: orgShortName,
          target_org: submittedTo
        });

      toast({
        title: "Success",
        description: "Letter of Appeal submitted successfully!",
      });
      setShowAppealForm(false);
      setAppealFile(null);
      setAppealSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting appeal:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to submit appeal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Show when target org (AO/LSG) has submitted an appeal to LCO/USG (check this first)
  if (targetOrgAppealSubmitted && !isOwnDeadline) {
    return (
      <div className="mt-3 p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border border-amber-300 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Appeal Submitted</span>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            <span className="font-bold" style={{ color: "#003b27" }}>{reportType} Report</span>
          </p>
          {targetOrg && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Organization:</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                {targetOrg === 'AO' ? 'Accredited Organizations' : targetOrg === 'LSG' ? 'Local Student Government' : targetOrg}
              </span>
            </div>
          )}
          <p className="text-xs text-amber-700 mt-2 leading-relaxed">
            An organization has submitted a Letter of Appeal. Please check and review it in the Submissions page.
          </p>
        </div>
      </div>
    );
  }

  // Show when own org has submitted an appeal
  if (appealSubmitted && isOwnDeadline) {
    // Check if appeal was approved (has override)
    if (appealApproved) {
      return (
        <div className="mt-3 p-4 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 border border-green-300 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-green-700">Appeal Approved</span>
          </div>
          <p className="text-xs text-green-700 leading-relaxed">
            The Appeal you submitted got approved. Please submit {reportType} on submission page today or your account will be on hold.
          </p>
        </div>
      );
    }
    
    // If not approved yet, show waiting message
    return (
      <div className="mt-3 p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border border-amber-300 rounded-xl shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Appeal Submitted</span>
        </div>
        <p className="text-xs text-amber-700 leading-relaxed">
          You already submitted an appeal. Wait for further announcement or approval.
        </p>
      </div>
    );
  }

  if (!showAppealForm) {
    // Show amber/orange color for approved appeal (extended deadline)
    const isApprovedAppeal = appealApproved;
    const bgColor = isApprovedAppeal 
      ? "bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 border border-amber-300"
      : "bg-gradient-to-br from-red-50 via-rose-50 to-red-100 border border-red-200";
    const pulseColor = isApprovedAppeal ? "bg-amber-500" : "bg-red-500";
    const badgeColor = isApprovedAppeal ? "text-amber-700" : "text-red-600";
    const borderColor = isApprovedAppeal ? "border-amber-200" : "border-red-200";
    
    return (
      <div className={`mt-3 p-4 ${bgColor} rounded-xl shadow-sm`}>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${pulseColor} animate-pulse`} />
          <span className={`text-xs font-semibold uppercase tracking-wider ${badgeColor}`}>
            {isApprovedAppeal ? "Extended Deadline" : "Deadline Today"}
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            <span className="font-bold" style={{ color: "#003b27" }}>{reportType} Report Due</span>
          </p>
          {targetOrg && !isOwnDeadline && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">Organization:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isApprovedAppeal ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                {targetOrg === 'AO' ? 'Accredited Organizations' : targetOrg === 'LSG' ? 'Local Student Government' : targetOrg}
              </span>
            </div>
          )}
          {canSubmitAppeal && isApprovedAppeal && (
            <p className="text-xs text-amber-700 leading-relaxed mt-2">
              Your appeal has been approved. You need to submit your {reportType} report today or your account will be on hold.
            </p>
          )}
          {!isApprovedAppeal && (
            <p className="text-xs text-gray-600 leading-relaxed">
              Today is the deadline for the submission of {reportType} report
            </p>
          )}
        </div>
        <div className={`mt-3 pt-3 border-t ${borderColor}`}>
          {canSubmitAppeal && !isApprovedAppeal ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">Want to file Letter of Appeal?</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setShowAppealForm(true)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-gray-50"
                  style={{ borderColor: "#003b27", color: "#003b27", border: "2px solid #003b27" }}
                >
                  YES
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-4 py-1.5 text-xs font-semibold border-2 rounded-lg bg-red-500 hover:bg-red-600 text-white"
                >
                  NO
                </Button>
              </div>
            </div>
          ) : isApprovedAppeal && canSubmitAppeal ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-amber-800">✅ Extended deadline due to approved appeal</p>
            </div>
          ) : (
            notificationSent ? (
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium">Notification sent</span>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleNotifyOrganization}
                className="w-full text-xs font-semibold rounded-lg border-2 hover:shadow-md transition-all"
                style={{ borderColor: "#003b27", color: "#003b27" }}
              >
                <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notify Organization
              </Button>
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-white border rounded-md" style={{ borderColor: "#003b27" }}>
      <h4 className="text-sm font-bold mb-3 pb-2 border-b" style={{ color: "#003b27", borderColor: "#d4af37" }}>
        LETTER OF APPEAL
      </h4>
      <div className="space-y-3">
        <div>
          <Label className="text-xs font-semibold mb-1.5 block" style={{ color: "#003b27" }}>
            Upload Letter of Appeal
          </Label>
          <Input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setAppealFile(e.target.files?.[0] || null)}
            className="text-xs h-9"
          />
        </div>
        <div className="p-2 bg-amber-50 border-l-2 rounded" style={{ borderColor: "#d4af37" }}>
          <p className="text-xs text-gray-700">
            <span className="font-semibold">Note:</span> Letter of Appeal is valid for only 3 days, you must submit your {reportType} on or before the deadline.
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: "#003b27", color: "#d4af37" }}
            disabled={!appealFile || submitting}
            onClick={handleSubmitAppeal}
          >
            {submitting ? 'Submitting...' : 'Submit Appeal'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="px-4 py-1.5 text-xs font-semibold"
            onClick={() => setShowAppealForm(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

interface Event {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  targetOrganization?: string;
  requireAccomplishment?: boolean;
  requireLiquidation?: boolean;
  isDeadline?: boolean;
  deadlineType?: 'accomplishment' | 'liquidation';
  parentEventId?: string;
}

// Helper function to add working days (excluding weekends)
const addWorkingDays = (startDate: Date, days: number): Date => {
  const result = new Date(startDate);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  
  return result;
};

// Helper function to calculate deadline date (single day)
const calculateDeadlineDate = (eventEndDate: string, workingDays: number): string => {
  const endDate = new Date(eventEndDate);
  const deadlineDate = addWorkingDays(endDate, workingDays);
  return deadlineDate.toISOString().split('T')[0];
};

interface Officer {
  id: string;
  name: string;
  position: string;
  image?: string;
}

interface AODashboardProps {
  orgName?: string;
  orgShortName?: string;
  showDeadline?: boolean;
  showAddButton?: boolean;
}

export default function AODashboard({ 
  orgName = "Accredited Organization", 
  orgShortName = "AO",
  showDeadline = true,
  showAddButton = false 
}: AODashboardProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; eventTitle: string; eventDescription: string; createdBy: string; createdAt: string; isRead: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [selectedTemplateOrg, setSelectedTemplateOrg] = useState<string | null>(null);
  const [uploadedTemplates, setUploadedTemplates] = useState<Record<string, { fiscal?: { fileName: string; fileUrl: string } }>>({});
  
  // Profile state
  const [showProfile, setShowProfile] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [orgLogo, setOrgLogo] = useState<string>("");
  
  // Accomplishment Report state
  const [accomplishmentActivityTitle, setAccomplishmentActivityTitle] = useState("");
  const [accomplishmentGdriveLink, setAccomplishmentGdriveLink] = useState("");
  const [accomplishmentErrors, setAccomplishmentErrors] = useState({
    title: false,
    link: false
  });
  
  // Liquidation Report state
  const [liquidationActivityTitle, setLiquidationActivityTitle] = useState("");
  const [liquidationGdriveLink, setLiquidationGdriveLink] = useState("");
  const [liquidationErrors, setLiquidationErrors] = useState({
    title: false,
    link: false
  });
  
  // Accomplishment Report handlers
  const isValidGdriveLink = (link: string) => {
    return link.includes('drive.google.com') || link.includes('docs.google.com');
  };

  const handleAccomplishmentSubmit = async () => {
    // Validate required fields
    const errors = {
      title: !accomplishmentActivityTitle,
      link: !accomplishmentGdriveLink || !isValidGdriveLink(accomplishmentGdriveLink)
    };

    setAccomplishmentErrors(errors);

    if (errors.title || errors.link) {
      return;
    }
    
    try {
      // Determine target organization based on current org
      // LSG → USG, LCO/USG/GSC/USED/TGP → OSLD, AO (Accredited Orgs) → LCO
      let targetOrg = 'LCO'; // Default for AO (Accredited Orgs)
      if (orgShortName === 'LSG') {
        targetOrg = 'USG';
      } else if (['LCO', 'USG', 'GSC', 'USED', 'TGP'].includes(orgShortName)) {
        targetOrg = 'OSLD';
      }

      // Save submission to database
      const { data: submissionData, error: dbError } = await supabase
        .from('submissions')
        .insert({
          organization: orgShortName,
          submission_type: 'Accomplishment Report',
          activity_title: accomplishmentActivityTitle,
          activity_duration: 'N/A',
          activity_venue: 'N/A',
          activity_participants: 'N/A',
          activity_funds: 'N/A',
          activity_budget: 'N/A',
          activity_sdg: 'N/A',
          activity_likha: 'N/A',
          file_url: accomplishmentGdriveLink,
          file_name: 'Google Drive Link',
          status: 'Pending',
          submitted_to: targetOrg
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        throw dbError;
      }

      // Create notification for target organization
      const orgFullNames: Record<string, string> = {
        "OSLD": "Office of Student Life and Development",
        "AO": "Accredited Organizations",
        "LSG": "Local Student Government",
        "GSC": "Graduating Student Council",
        "LCO": "League of Campus Organization",
        "USG": "University Student Government",
        "TGP": "The Gold Panicles",
        "USED": "University Student Enterprise Development"
      };
      
      await supabase
        .from('notifications')
        .insert({
          event_id: submissionData.id,
          event_title: `New Accomplishment Report from ${orgFullNames[orgShortName] || orgShortName}`,
          event_description: `${orgFullNames[orgShortName] || orgShortName} submitted an Accomplishment Report for "${accomplishmentActivityTitle}". Check it out!`,
          created_by: orgShortName,
          target_org: targetOrg
        });

      handleAccomplishmentCancel();
      setSuccessSubmissionType("Accomplishment Report");
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Error submitting accomplishment report:', error);
      alert(`Failed to submit accomplishment report: ${error.message || 'Please try again.'}`);
    }
  };

  const handleAccomplishmentCancel = () => {
    setAccomplishmentActivityTitle("");
    setAccomplishmentGdriveLink("");
    setAccomplishmentErrors({ title: false, link: false });
  };

  // Liquidation Report handlers
  const handleLiquidationSubmit = async () => {
    // Validate required fields
    const errors = {
      title: !liquidationActivityTitle,
      link: !liquidationGdriveLink || !isValidGdriveLink(liquidationGdriveLink)
    };

    setLiquidationErrors(errors);

    if (errors.title || errors.link) {
      return;
    }
    
    try {
      // Determine target organization based on current org
      // LSG → USG, LCO/USG/GSC/USED/TGP → OSLD, AO (Accredited Orgs) → LCO
      let targetOrg = 'LCO'; // Default for AO (Accredited Orgs)
      if (orgShortName === 'LSG') {
        targetOrg = 'USG';
      } else if (['LCO', 'USG', 'GSC', 'USED', 'TGP'].includes(orgShortName)) {
        targetOrg = 'OSLD';
      }

      // Save submission to database
      const { data: submissionData, error: dbError } = await supabase
        .from('submissions')
        .insert({
          organization: orgShortName,
          submission_type: 'Liquidation Report',
          activity_title: liquidationActivityTitle,
          activity_duration: 'N/A',
          activity_venue: 'N/A',
          activity_participants: 'N/A',
          activity_funds: 'N/A',
          activity_budget: 'N/A',
          activity_sdg: 'N/A',
          activity_likha: 'N/A',
          file_url: liquidationGdriveLink,
          file_name: 'Google Drive Link',
          status: 'Pending',
          submitted_to: targetOrg
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Create notification for target organization
      const orgFullNames: Record<string, string> = {
        "OSLD": "Office of Student Life and Development",
        "AO": "Accredited Organizations",
        "LSG": "Local Student Government",
        "GSC": "Graduating Student Council",
        "LCO": "League of Campus Organization",
        "USG": "University Student Government",
        "TGP": "The Gold Panicles",
        "USED": "University Student Enterprise Development"
      };
      
      await supabase
        .from('notifications')
        .insert({
          event_id: submissionData.id,
          event_title: `New Liquidation Report from ${orgFullNames[orgShortName] || orgShortName}`,
          event_description: `${orgFullNames[orgShortName] || orgShortName} submitted a Liquidation Report for "${liquidationActivityTitle}". Check it out!`,
          created_by: orgShortName,
          target_org: targetOrg
        });

      handleLiquidationCancel();
      setSuccessSubmissionType("Liquidation Report");
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error submitting liquidation report:', error);
      alert('Failed to submit liquidation report. Please try again.');
    }
  };

  const handleLiquidationCancel = () => {
    setLiquidationActivityTitle("");
    setLiquidationGdriveLink("");
    setLiquidationErrors({ title: false, link: false });
  };
  
  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      // Load from localStorage first (set during login) - use organization-specific keys
      const orgKey = orgShortName.toLowerCase();
      const storedEmail = localStorage.getItem(`${orgKey}_userEmail`);
      const storedPassword = localStorage.getItem(`${orgKey}_userPassword`);
      
      if (storedEmail) {
        setCurrentEmail(storedEmail);
      }
      if (storedPassword) {
        setCurrentPassword(storedPassword);
      }
      
      // Fallback to Supabase auth if no localStorage data
      if (!storedEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentEmail(user.email || "");
        }
      }
    };
    loadUserData();
  }, []);
  
  // Check account status
  useEffect(() => {
    const checkAccountStatus = async () => {
      const orgKey = orgShortName.toLowerCase();
      const storedEmail = localStorage.getItem(`${orgKey}_userEmail`);
      
      if (storedEmail) {
        const { data, error } = await supabase
          .from('org_accounts')
          .select('status')
          .eq('email', storedEmail)
          .single();
        
        if (data && !error) {
          setAccountStatus(data.status);
          setIsOnHold(data.status === 'On Hold');
        }
      }
    };
    checkAccountStatus();
    
    // Check status periodically
    const interval = setInterval(checkAccountStatus, 30000);
    return () => clearInterval(interval);
  }, [orgShortName]);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  
  // Account status state
  const [accountStatus, setAccountStatus] = useState<string>("Active");
  const [isOnHold, setIsOnHold] = useState(false);
  const [isOnHoldDialogOpen, setIsOnHoldDialogOpen] = useState(false);
  
  // Profile sections state
  const [accreditationStatus, setAccreditationStatus] = useState("Active");
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [advisers, setAdvisers] = useState<Officer[]>([]);
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([]);
  const [actionPlanFiles, setActionPlanFiles] = useState<File[]>([]);
  const [platforms, setPlatforms] = useState({ facebook: "" });
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  
  // Officer/Adviser modal state
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [isAdviserModalOpen, setIsAdviserModalOpen] = useState(false);
  const [isSocialContactModalOpen, setIsSocialContactModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [editingAdviser, setEditingAdviser] = useState<Officer | null>(null);
  const [officerName, setOfficerName] = useState("");
  const [officerRole, setOfficerRole] = useState("");
  const [officerProgram, setOfficerProgram] = useState("");
  const [officerIdNumber, setOfficerIdNumber] = useState("");
  const [officerImage, setOfficerImage] = useState("");
  const [adviserName, setAdviserName] = useState("");
  const [adviserYearsExperience, setAdviserYearsExperience] = useState("");
  const [adviserExpertise, setAdviserExpertise] = useState<string[]>([]);
  const [adviserImage, setAdviserImage] = useState("");
  const [editFacebookLink, setEditFacebookLink] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  
  // Event modal state (for COA add button)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventTargetOrg, setEventTargetOrg] = useState("ALL");
  const [eventRequireAccomplishment, setEventRequireAccomplishment] = useState(false);
  const [eventRequireLiquidation, setEventRequireLiquidation] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [activeView, setActiveView] = useState<"TODAY" | "EVENT" | "DEADLINE">("TODAY");

  // Organization list for dropdown
  const organizationsList = [
    { key: "ALL", name: "All Organizations" },
    { key: "AO", name: "Accredited Organizations" },
    { key: "LSG", name: "Local Student Government" },
    { key: "GSC", name: "Graduating Student Council" },
    { key: "LCO", name: "League of Campus Organization" },
    { key: "USG", name: "University Student Government" },
    { key: "TGP", name: "The Gold Panicles" },
    { key: "USED", name: "University Student Enterprise Development" },
  ];

  // Request to Conduct Activity state
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDate, setActivityDate] = useState<Date>();
  const [activityEndDate, setActivityEndDate] = useState<Date>();
  const [activityRecurrenceType, setActivityRecurrenceType] = useState("");
  const [activityVenue, setActivityVenue] = useState("");
  const [activityParticipants, setActivityParticipants] = useState("");
  const [activityFunds, setActivityFunds] = useState("");
  const [activityBudget, setActivityBudget] = useState("");
  const [activitySDG, setActivitySDG] = useState("");
  const [activityLIKHA, setActivityLIKHA] = useState("");
  const [activityDesignLink, setActivityDesignLink] = useState("");
  const [activityErrors, setActivityErrors] = useState({
    title: false,
    date: false,
    recurrenceType: false,
    venue: false,
    participants: false,
    funds: false,
    budget: false,
    sdg: false,
    likha: false,
    designLink: false
  });
  const [hasPendingSubmission, setHasPendingSubmission] = useState(false);
  const [pendingSubmissionStatus, setPendingSubmissionStatus] = useState<string | null>(null);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successSubmissionType, setSuccessSubmissionType] = useState<string>("");

  // Activity Logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isLogDetailOpen, setIsLogDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<any>(null);

  // Load events from database
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data: eventsData } = await supabase
          .from('osld_events')
          .select('*, accomplishment_deadline_override, liquidation_deadline_override');
        
        if (eventsData) {
          const formattedEvents: Event[] = [];
          
          eventsData.forEach(e => {
            // Add the main event
            formattedEvents.push({
              id: e.id,
              title: e.title,
              description: e.description,
              startDate: e.start_date,
              endDate: e.end_date,
              startTime: e.start_time,
              endTime: e.end_time,
              allDay: e.all_day,
              targetOrganization: e.target_organization,
              requireAccomplishment: e.require_accomplishment,
              requireLiquidation: e.require_liquidation
            });
            
            // Generate deadline events based on organization type
            // LCO sees deadlines for AO and LCO events, USG sees deadlines for LSG and USG events
            // All other orgs see their own deadlines
            let shouldShowDeadline = false;
            
            if (orgShortName === 'LCO') {
              // LCO sees deadlines for AO events (to notify them) and LCO events (their own)
              shouldShowDeadline = e.target_organization === 'AO' || e.target_organization === 'LCO';
            } else if (orgShortName === 'USG') {
              // USG sees deadlines for LSG events (to notify them) and USG events (their own)
              shouldShowDeadline = e.target_organization === 'LSG' || e.target_organization === 'USG';
            } else {
              // All other orgs (AO, LSG, GSC, USED, TGP) see deadlines for events targeted to them
              shouldShowDeadline = e.target_organization === orgShortName;
            }
            
            if (shouldShowDeadline && e.end_date) {
              // Add accomplishment report deadline (3 working days after event)
              if (e.require_accomplishment) {
                // Use override date if appeal was approved, otherwise calculate from end_date
                const accomDeadlineDate = e.accomplishment_deadline_override || calculateDeadlineDate(e.end_date, 3);
                formattedEvents.push({
                  id: `${e.id}-accom-deadline`,
                  title: e.title,
                  description: `Due date for accomplishment report for "${e.title}"`,
                  startDate: accomDeadlineDate,
                  endDate: accomDeadlineDate,
                  allDay: true,
                  isDeadline: true,
                  deadlineType: 'accomplishment',
                  parentEventId: e.id,
                  targetOrganization: e.target_organization,
                  hasOverride: !!e.accomplishment_deadline_override
                });
              }
              
              // Add liquidation report deadline (7 working days after event)
              if (e.require_liquidation) {
                // Use override date if appeal was approved, otherwise calculate from end_date
                const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 7);
                formattedEvents.push({
                  id: `${e.id}-liq-deadline`,
                  title: e.title,
                  description: `Due date for liquidation report for "${e.title}"`,
                  startDate: liqDeadlineDate,
                  endDate: liqDeadlineDate,
                  allDay: true,
                  isDeadline: true,
                  deadlineType: 'liquidation',
                  parentEventId: e.id,
                  targetOrganization: e.target_organization,
                  hasOverride: !!e.liquidation_deadline_override
                });
              }
            }
          });
          
          setEvents(formattedEvents);
        }

        // Load notifications - only notifications targeted to this org or ALL
        const { data: notificationsData } = await supabase
          .from('notifications')
          .select('*')
          .or(`target_org.eq.${orgShortName},target_org.eq.ALL`)
          .order('created_at', { ascending: false });
        
        // Load read status for this organization
        const { data: readStatusData } = await supabase
          .from('notification_read_status')
          .select('notification_id')
          .eq('read_by', orgShortName);
        
        const readNotificationIds = new Set(readStatusData?.map(r => r.notification_id) || []);
        
        if (notificationsData) {
          setNotifications(notificationsData.map(n => ({
            id: n.id,
            eventTitle: n.event_title,
            eventDescription: n.event_description || '',
            createdBy: n.created_by,
            createdAt: n.created_at,
            isRead: readNotificationIds.has(n.id)
          })));
          setUnreadCount(notificationsData.filter(n => !readNotificationIds.has(n.id)).length);
        }
      } catch (err) {
        console.error("Error loading events:", err);
      }
    };
    loadEvents();
  }, [orgShortName]);

  // Load organization logo on mount
  useEffect(() => {
    const loadOrgLogo = async () => {
      try {
        const { data: files } = await supabase.storage
          .from('osld-files')
          .list('logos', {
            search: `${orgShortName}_logo`
          });

        if (files && files.length > 0) {
          const { data } = supabase.storage
            .from('osld-files')
            .getPublicUrl(`logos/${files[0].name}`);
          
          setOrgLogo(data.publicUrl);
        }
      } catch (error) {
        console.error("Error loading logo:", error);
      }
    };
    loadOrgLogo();
  }, [orgShortName]);

  // Check for pending submissions
  useEffect(() => {
    const checkPendingSubmission = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('organization', orgShortName)
        .eq('submission_type', 'Request to Conduct Activity')
        .eq('status', 'Pending')
        .limit(1);
      
      setHasPendingSubmission((data?.length || 0) > 0);
      if (data && data.length > 0) {
        setPendingSubmissionStatus(data[0].status);
      } else {
        setPendingSubmissionStatus(null);
      }
    };
    checkPendingSubmission();
  }, [orgShortName]);

  // Load activity logs
  useEffect(() => {
    const loadActivityLogs = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .or(`organization.eq.${orgShortName},submitted_to.eq.${orgShortName}`)
        .order('submitted_at', { ascending: false });
      
      if (data) {
        setActivityLogs(data.map(s => ({
          id: s.id,
          documentName: s.activity_title,
          type: s.submission_type,
          organization: s.organization,
          status: s.status,
          date: new Date(s.submitted_at).toLocaleDateString(),
          fileUrl: s.file_url,
          fileName: s.file_name,
          revisionReason: s.revision_reason,
          ...s
        })));
      }
    };
    loadActivityLogs();
  }, [orgShortName]);

  // Reload activity logs function
  const reloadActivityLogs = async () => {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .or(`organization.eq.${orgShortName},submitted_to.eq.${orgShortName}`)
      .order('submitted_at', { ascending: false });
    
    if (data) {
      setActivityLogs(data.map(s => ({
        id: s.id,
        documentName: s.activity_title,
        type: s.submission_type,
        organization: s.organization,
        status: s.status,
        date: new Date(s.submitted_at).toLocaleDateString(),
        fileUrl: s.file_url,
        fileName: s.file_name,
        revisionReason: s.revision_reason,
        ...s
      })));
    }
  };

  // Delete activity log
  const handleDeleteLog = async () => {
    if (!logToDelete) return;

    const logId = logToDelete.id;
    const logFileName = logToDelete.fileName;

    // Close dialog and clear state
    setIsDeleteDialogOpen(false);
    setLogToDelete(null);

    // Immediately remove from UI
    setActivityLogs(prev => prev.filter(log => log.id !== logId));

    // Delete from database
    await supabase
      .from('submissions')
      .delete()
      .eq('id', logId);

    // Also try to delete the file from storage if it exists
    if (logFileName) {
      await supabase.storage
        .from('form-templates')
        .remove([logFileName]);
    }
    
    // Refresh pending submission check
    const { data } = await supabase
      .from('submissions')
      .select('id, status')
      .eq('organization', orgShortName)
      .eq('submission_type', 'Request to Conduct Activity')
      .eq('status', 'Pending')
      .limit(1);
    
    setHasPendingSubmission((data?.length || 0) > 0);
    if (data && data.length > 0) {
      setPendingSubmissionStatus(data[0].status);
    } else {
      setPendingSubmissionStatus(null);
    }
  };

  // Load uploaded templates from Supabase
  useEffect(() => {
    const loadTemplates = async () => {
      const { data, error } = await supabase
        .from("form_templates")
        .select("*");
      
      if (error) {
        console.error("Error loading templates:", error);
        return;
      }

      if (data) {
        const templatesMap: Record<string, { fiscal?: { fileName: string; fileUrl: string } }> = {};
        data.forEach((template: { organization: string; template_type: string; file_name: string; file_url: string }) => {
          if (!templatesMap[template.organization]) {
            templatesMap[template.organization] = {};
          }
          if (template.template_type === "fiscal") {
            templatesMap[template.organization].fiscal = {
              fileName: template.file_name,
              fileUrl: template.file_url
            };
          }
        });
        setUploadedTemplates(templatesMap);
      }
    };
    loadTemplates();
  }, []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  const handleMonthChange = (monthIndex: number, yearValue: number) => {
    setCurrentDate(new Date(yearValue, monthIndex, 1));
    setIsMonthPickerOpen(false);
  };

  const handleLogout = () => {
    window.location.href = "/";
  };

  const openAddEventModal = () => {
    setEditingEvent(null);
    setEventTitle("");
    setEventDescription("");
    setEventStartDate("");
    setEventEndDate("");
    setEventStartTime("");
    setEventEndTime("");
    setEventAllDay(false);
    setEventTargetOrg("ALL");
    setEventRequireAccomplishment(false);
    setEventRequireLiquidation(false);
    setFormError("");
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim()) {
      setFormError("Event title is required");
      return;
    }
    if (!eventStartDate) {
      setFormError("Start date is required");
      return;
    }

    if (editingEvent) {
      await supabase
        .from('osld_events')
        .update({
          title: eventTitle,
          description: eventDescription,
          start_date: eventStartDate,
          end_date: eventEndDate,
          start_time: eventStartTime,
          end_time: eventEndTime,
          all_day: eventAllDay,
          target_organization: eventTargetOrg,
          require_accomplishment: eventRequireAccomplishment,
          require_liquidation: eventRequireLiquidation
        })
        .eq('id', editingEvent.id);

      // Remove old event and its deadline events, then add updated ones
      const filteredEvents = events.filter((e) => 
        e.id !== editingEvent.id && e.parentEventId !== editingEvent.id
      );
      
      const updatedEvent: Event = {
        id: editingEvent.id,
        title: eventTitle,
        description: eventDescription,
        startDate: eventStartDate,
        endDate: eventEndDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        allDay: eventAllDay,
        targetOrganization: eventTargetOrg,
        requireAccomplishment: eventRequireAccomplishment,
        requireLiquidation: eventRequireLiquidation,
      };
      
      setEvents([...filteredEvents, updatedEvent]);
    } else {
      const newEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        description: eventDescription,
        start_date: eventStartDate,
        end_date: eventEndDate || eventStartDate,
        start_time: eventStartTime,
        end_time: eventEndTime,
        all_day: eventAllDay,
        target_organization: eventTargetOrg,
        require_accomplishment: eventRequireAccomplishment,
        require_liquidation: eventRequireLiquidation,
      };

      await supabase
        .from('osld_events')
        .insert(newEvent);

      // Create notification for new event (notify all orgs except the creator)
      const allOrgs = ['AO', 'LSG', 'GSC', 'LCO', 'USG', 'TGP', 'OSLD', 'COA'];
      const targetOrgs = allOrgs.filter(org => org !== orgShortName);
      const notificationPromises = targetOrgs.map(org => 
        supabase
          .from('notifications')
          .insert({
            event_id: newEvent.id,
            event_title: newEvent.title,
            event_description: newEvent.description,
            created_by: orgShortName,
            target_org: org
          })
      );
      await Promise.all(notificationPromises);

      // Send notification about required reports (only to chosen organization)
      if ((eventRequireAccomplishment || eventRequireLiquidation) && eventTargetOrg !== 'ALL') {
        const reportTypes = [];
        if (eventRequireAccomplishment) reportTypes.push('Accomplishment');
        if (eventRequireLiquidation) reportTypes.push('Liquidation');
        
        const accomDeadline = eventRequireAccomplishment ? calculateDeadlineDate(newEvent.end_date, 3) : null;
        const liqDeadline = eventRequireLiquidation ? calculateDeadlineDate(newEvent.end_date, 7) : null;
        
        let deadlineInfo = '';
        if (accomDeadline) deadlineInfo += `Accomplishment Report due: ${accomDeadline}`;
        if (liqDeadline) deadlineInfo += `${accomDeadline ? ', ' : ''}Liquidation Report due: ${liqDeadline}`;
        
        await supabase
          .from('notifications')
          .insert({
            event_id: newEvent.id,
            event_title: `${reportTypes.join(' & ')} Report Required: ${newEvent.title}`,
            event_description: `${orgShortName} requires submission of ${reportTypes.join(' and ')} report for "${newEvent.title}". ${deadlineInfo}`,
            created_by: orgShortName,
            target_org: eventTargetOrg
          });
      }

      setEvents([...events, {
        id: newEvent.id,
        title: newEvent.title,
        description: newEvent.description,
        startDate: newEvent.start_date,
        endDate: newEvent.end_date,
        startTime: newEvent.start_time,
        endTime: newEvent.end_time,
        allDay: newEvent.all_day,
        targetOrganization: newEvent.target_organization,
        requireAccomplishment: newEvent.require_accomplishment,
        requireLiquidation: newEvent.require_liquidation
      }]);

      // Reload notifications - only notifications targeted to this org or ALL
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .or(`target_org.eq.${orgShortName},target_org.eq.ALL`)
        .order('created_at', { ascending: false });
      
      // Load read status for this organization
      const { data: readStatusData } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('read_by', orgShortName);
      
      const readNotificationIds = new Set(readStatusData?.map(r => r.notification_id) || []);
      
      if (notificationsData) {
        setNotifications(notificationsData.map(n => ({
          id: n.id,
          eventTitle: n.event_title,
          eventDescription: n.event_description || '',
          createdBy: n.created_by,
          createdAt: n.created_at,
          isRead: readNotificationIds.has(n.id)
        })));
        setUnreadCount(notificationsData.filter(n => !readNotificationIds.has(n.id)).length);
      }
    }

    setIsEventModalOpen(false);
    setEventTitle("");
    setEventDescription("");
    setEventStartDate("");
    setEventEndDate("");
    setEventAllDay(false);
    setEventTargetOrg("ALL");
    setEventRequireAccomplishment(false);
    setEventRequireLiquidation(false);
    setEditingEvent(null);
  };

  const openEditEventModal = (event: Event) => {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventDescription(event.description || "");
    setEventStartDate(event.startDate);
    setEventEndDate(event.endDate);
    setEventStartTime(event.startTime || "");
    setEventEndTime(event.endTime || "");
    setEventAllDay(event.allDay);
    setEventTargetOrg(event.targetOrganization || "ALL");
    setEventRequireAccomplishment(event.requireAccomplishment || false);
    setEventRequireLiquidation(event.requireLiquidation || false);
    setFormError("");
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    await supabase
      .from('osld_events')
      .delete()
      .eq('id', eventId);
    // Remove the event and any associated deadline events
    setEvents(events.filter(e => e.id !== eventId && e.parentEventId !== eventId));
  };

  // Image upload handler
  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "officer" | "adviser",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (type === "officer") {
          setOfficerImage(base64String);
        } else {
          setAdviserImage(base64String);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Officer functions
  const openAddOfficerModal = () => {
    setEditingOfficer(null);
    setOfficerName("");
    setOfficerRole("");
    setOfficerProgram("");
    setOfficerIdNumber("");
    setOfficerImage("");
    setIsOfficerModalOpen(true);
  };

  const openEditOfficerModal = (officer: Officer) => {
    setEditingOfficer(officer);
    setOfficerName(officer.name);
    // Parse position to extract role, program, id_number
    const parts = officer.position.split(" | ");
    setOfficerRole(parts[0] || "");
    setOfficerProgram(parts[1] || "");
    setOfficerIdNumber(parts[2] || "");
    setOfficerImage(officer.image || "");
    setIsOfficerModalOpen(true);
  };

  const handleSaveOfficer = async () => {
    if (!officerName.trim() || !officerRole.trim()) return;
    
    // Store role, program, id_number in position field as "Role | Program | ID"
    const position = [officerRole, officerProgram, officerIdNumber].filter(Boolean).join(" | ");
    
    try {
      if (editingOfficer) {
        const { error } = await supabase
          .from("org_officers")
          .update({
            name: officerName,
            position: position,
            image: officerImage || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingOfficer.id);

        if (error) throw error;

        const newOfficer: Officer = {
          id: editingOfficer.id,
          name: officerName,
          position: position,
          image: officerImage,
        };
        setOfficers(officers.map(o => o.id === editingOfficer.id ? newOfficer : o));
      } else {
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: orgShortName.toLowerCase(),
            name: officerName,
            position: position,
            image: officerImage || null,
          })
          .select()
          .single();

        if (error) throw error;

        const newOfficer: Officer = {
          id: data.id,
          name: officerName,
          position: position,
          image: officerImage,
        };
        setOfficers([...officers, newOfficer]);
      }

      setIsOfficerModalOpen(false);
      setOfficerName("");
      setOfficerRole("");
      setOfficerProgram("");
      setOfficerIdNumber("");
      setOfficerImage("");
      setEditingOfficer(null);
    } catch (error) {
      console.error("Error saving officer:", error);
    }
  };

  const removeOfficer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setOfficers(officers.filter(o => o.id !== id));
    } catch (error) {
      console.error("Error removing officer:", error);
    }
  };

  // Adviser functions
  const openAddAdviserModal = () => {
    setEditingAdviser(null);
    setAdviserName("");
    setAdviserYearsExperience("");
    setAdviserExpertise([]);
    setAdviserImage("");
    setIsAdviserModalOpen(true);
  };

  const openEditAdviserModal = (adviser: Officer) => {
    setEditingAdviser(adviser);
    setAdviserName(adviser.name);
    // Parse position to extract years and expertise
    const parts = adviser.position.replace(/\s*adviser\s*/gi, '').split(" | ");
    setAdviserYearsExperience(parts[0] || "");
    // Split expertise by comma or semicolon
    const expertiseStr = parts[1] || "";
    setAdviserExpertise(expertiseStr ? expertiseStr.split(/[,;]/).map(e => e.trim()).filter(Boolean) : []);
    setAdviserImage(adviser.image || "");
    setIsAdviserModalOpen(true);
  };

  const handleSaveAdviser = async () => {
    if (!adviserName.trim()) return;
    
    // Store years and expertise in position field as "Years | Expertise1, Expertise2 Adviser"
    const expertiseStr = adviserExpertise.filter(Boolean).join(", ");
    const positionParts = [adviserYearsExperience, expertiseStr].filter(Boolean).join(" | ");
    const finalPosition = positionParts ? `${positionParts} Adviser` : "Adviser";
    
    try {
      if (editingAdviser) {
        const { error } = await supabase
          .from("org_officers")
          .update({
            name: adviserName,
            position: finalPosition,
            image: adviserImage || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAdviser.id);

        if (error) throw error;

        const newAdviser: Officer = {
          id: editingAdviser.id,
          name: adviserName,
          position: finalPosition,
          image: adviserImage,
        };
        setAdvisers(advisers.map(a => a.id === editingAdviser.id ? newAdviser : a));
      } else {
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: orgShortName.toLowerCase(),
            name: adviserName,
            position: finalPosition,
            image: adviserImage || null,
          })
          .select()
          .single();

        if (error) throw error;

        const newAdviser: Officer = {
          id: data.id,
          name: adviserName,
          position: finalPosition,
          image: adviserImage,
        };
        setAdvisers([...advisers, newAdviser]);
      }

      setIsAdviserModalOpen(false);
      setAdviserName("");
      setAdviserYearsExperience("");
      setAdviserExpertise([]);
      setAdviserImage("");
      setEditingAdviser(null);
    } catch (error) {
      console.error("Error saving adviser:", error);
    }
  };

  const removeAdviser = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAdvisers(advisers.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error removing adviser:", error);
    }
  };

  // Social & Contact functions
  const openSocialContactModal = () => {
    setEditFacebookLink(platforms.facebook || "");
    setEditContactEmail(contactEmail || "");
    setEditContactPhone(contactPhone || "");
    setIsSocialContactModalOpen(true);
  };

  const handleSaveSocialContact = async () => {
    try {
      const { error } = await supabase
        .from("org_social_contacts")
        .upsert({
          organization: orgShortName.toLowerCase(),
          facebook_url: editFacebookLink || null,
          contact_email: editContactEmail || null,
          contact_phone: editContactPhone || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization' });

      if (error) throw error;

      setPlatforms({ facebook: editFacebookLink });
      setContactEmail(editContactEmail);
      setContactPhone(editContactPhone);
      setIsSocialContactModalOpen(false);
    } catch (error) {
      console.error("Error saving social contacts:", error);
    }
  };

  const deleteAdviser = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAdvisers(advisers.filter(a => a.id !== id));
    } catch (error) {
      console.error("Error deleting adviser:", error);
    }
  };

  const deleteOfficer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setOfficers(officers.filter(o => o.id !== id));
    } catch (error) {
      console.error("Error deleting officer:", error);
    }
  };

  const handleSendVerification = () => {
    setIsVerificationSent(true);
  };

  const handleSaveProfile = () => {
    console.log("Profile saved");
  };

  // Load officers, advisers, and social contacts from database on mount
  useEffect(() => {
    const loadOfficersAndAdvisers = async () => {
      try {
        const { data, error } = await supabase
          .from("org_officers")
          .select("*")
          .eq("organization", orgShortName.toLowerCase());

        if (error) throw error;

        if (data) {
          // Separate officers and advisers based on position
          const loadedOfficers = data.filter(
            (item) => !item.position.toLowerCase().includes("adviser")
          );
          const loadedAdvisers = data.filter((item) =>
            item.position.toLowerCase().includes("adviser")
          );

          setOfficers(loadedOfficers);
          setAdvisers(loadedAdvisers);
        }
      } catch (error) {
        console.error("Error loading officers and advisers:", error);
      }
    };

    const loadSocialContacts = async () => {
      try {
        const { data } = await supabase
          .from("org_social_contacts")
          .select("*")
          .eq("organization", orgShortName.toLowerCase())
          .maybeSingle();

        if (data) {
          setPlatforms({ facebook: data.facebook_url || "" });
          setContactEmail(data.contact_email || "");
          setContactPhone(data.contact_phone || "");
        }
      } catch (error) {
        console.error("Error loading social contacts:", error);
      }
    };

    loadOfficersAndAdvisers();
    loadSocialContacts();
  }, []);

  // Helper function to get events for a specific day
  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => {
      const start = event.startDate;
      const end = event.endDate || event.startDate;
      return dateStr >= start && dateStr <= end;
    });
  };

  // Helper function to check if a day has deadline events
  const hasDeadlineOnDay = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.some(event => {
      if (!event.isDeadline) return false;
      const start = event.startDate;
      const end = event.endDate || event.startDate;
      return dateStr >= start && dateStr <= end;
    });
  };

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    let filteredEvents = events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
    
    // Filter based on active view
    if (activeView === "DEADLINE") {
      filteredEvents = filteredEvents.filter(event => event.isDeadline);
    }
    
    return filteredEvents;
  };

  // Format selected date
  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get event day number
  const getEventDayNumber = (event: Event, currentDate: Date) => {
    const start = new Date(event.startDate);
    const current = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  // Check if org can edit events (only OSLD and COA)
  const canEditEvents = orgShortName === "COA";

  const renderCalendar = () => {
    const days = [];
    const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-4"></div>);
    }

    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === todayDay &&
        currentDate.getMonth() === todayMonth &&
        currentDate.getFullYear() === todayYear;
      const dayDate = new Date(year, currentDate.getMonth(), day);
      const dayEvents = getEventsForDay(day);
      const hasEvent = dayEvents.length > 0;
      const hasDeadline = dayEvents.some(e => e.isDeadline);

      // Determine background style based on activeView
      let bgStyle = {};
      if (activeView === "TODAY") {
        // TODAY view: only yellow for today's date
        if (isToday) {
          bgStyle = { backgroundColor: "rgba(212, 175, 55, 0.2)" };
        }
      } else if (activeView === "DEADLINE") {
        // DEADLINE view: only show deadlines in light red
        if (hasDeadline) {
          bgStyle = { backgroundColor: "rgba(239, 68, 68, 0.15)" };
        }
      } else {
        // EVENT view: show all events
        if (isToday) {
          bgStyle = { backgroundColor: "rgba(212, 175, 55, 0.2)" };
        } else if (hasDeadline) {
          bgStyle = { backgroundColor: "rgba(239, 68, 68, 0.15)" };
        } else if (hasEvent) {
          bgStyle = { backgroundColor: "rgba(0, 59, 39, 0.1)" };
        }
      }

      // Filter events to display based on activeView
      const displayEvents = activeView === "DEADLINE" 
        ? dayEvents.filter(e => e.isDeadline)
        : dayEvents;

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(dayDate)}
          style={bgStyle}
          className={`p-2 cursor-pointer rounded-lg min-h-[80px] border ${!isToday && !hasEvent ? "bg-white" : ""} hover:bg-gray-100 relative transition-colors`}
        >
          <div className="text-lg font-semibold text-left">{day}</div>
          {displayEvents.length > 0 && (
            <div className="absolute top-2 right-2 flex gap-1">
              {displayEvents.slice(0, 3).map((event, idx) => (
                <div
                  key={idx}
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: event.isDeadline 
                      ? '#ef4444'
                      : "#003b27" 
                  }}
                ></div>
              ))}
              {displayEvents.length > 3 && (
                <span
                  className="text-xs font-bold ml-1"
                  style={{ color: "#003b27" }}
                >
                  +{displayEvents.length - 3}
                </span>
              )}
            </div>
          )}
        </div>,
      );
    }

    return (
      <>
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-3 text-center font-bold text-sm bg-gray-200 text-gray-700"
          >
            {day}
          </div>
        ))}
        {days}
      </>
    );
  };

  const renderMonthPicker = () => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return (
      <div className="p-4 w-80">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentDate(new Date(year - 1, currentDate.getMonth(), 1))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-bold">{year}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentDate(new Date(year + 1, currentDate.getMonth(), 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {months.map((month, index) => (
            <Button
              key={month}
              variant={currentDate.getMonth() === index ? "default" : "outline"}
              size="sm"
              onClick={() => handleMonthChange(index, year)}
              className="text-xs"
            >
              {month.slice(0, 3)}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  // For COA: filter submissions to show only specific orgs' liquidation reports
  const coaLiquidationViewOrgs = ["USG", "LSG", "AO", "GSC", "USED"];

  const navItems = orgShortName === "COA" ? [
    "Dashboard",
    "University Student Government",
    "Local Student Government",
    "Accredited Organizations",
    "Graduating Student Council",
    "Student Entrepreneurship Development Unit",
    "Activity Logs",
    "Officers",
    "Organizations",
  ] : (orgShortName === "LCO" || orgShortName === "USG") ? [
    "Dashboard",
    "Request to Conduct Activity",
    "Accomplishment Report",
    "Liquidation Report",
    "Submissions",
    "Form Templates",
    "Activity Logs",
    "Officers",
    "Organizations",
  ] : [
    "Dashboard",
    "Request to Conduct Activity",
    "Accomplishment Report",
    "Liquidation Report",
    "Form Templates",
    "Activity Logs",
    "Officers",
    "Organizations",
  ];

  // Render Form Templates Section
  if (activeNav === "Form Templates") {
    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Mobile Menu Button */}
        <Button
          className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          style={{ backgroundColor: "#003b27" }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
        </Button>

        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
                style={{ ringColor: "#d4af37" }}
              >
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt="Organization Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  {orgShortName}
                </h1>
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item ? { backgroundColor: "#d4af37" } : undefined
                }
                variant={activeNav === item ? "default" : "ghost"}
              >
                {item}
              </Button>
            ))}
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start mb-2 text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>
        </div>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <h2
              className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8"
              style={{ color: "#003b27" }}
            >
              Form Templates
            </h2>

            {/* Organization Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[
                { key: "AO", name: "Accredited Organizations" },
                { key: "LSG", name: "Local Student Government" },
                { key: "GSC", name: "Graduating Student Council" },
                { key: "LCO", name: "League of Campus Organization" },
                { key: "USG", name: "University Student Government" },
                { key: "TGP", name: "The Gold Panicles" },
                { key: "USED", name: "University Student Enterprise Development" }
              ].map((org) => (
                <Card
                  key={org.key}
                  className={`p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 hover:scale-[1.02] ${
                    selectedTemplateOrg === org.key
                      ? "bg-[#003b27]"
                      : ""
                  }`}
                  style={{ borderLeftColor: "#003b27" }}
                  onClick={() => setSelectedTemplateOrg(selectedTemplateOrg === org.key ? null : org.key)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: selectedTemplateOrg === org.key ? "#d4af37" : "#003b27" }}
                    >
                      <Users className="h-6 w-6" style={{ color: selectedTemplateOrg === org.key ? "#003b27" : "#d4af37" }} />
                    </div>
                    <div>
                      <h3
                        className={`font-bold text-lg ${
                          selectedTemplateOrg === org.key ? "text-[#d4af37]" : "text-[#003b27]"
                        }`}
                      >
                        {org.key}
                      </h3>
                      <p className={`text-sm ${selectedTemplateOrg === org.key ? "text-gray-300" : "text-gray-600"}`}>
                        {org.name}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Template Download Section - Only visible when org is selected */}
            {selectedTemplateOrg && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold" style={{ color: "#003b27" }}>
                  Templates for {
                    {
                      "AO": "Accredited Organizations",
                      "LSG": "Local Student Government",
                      "GSC": "Graduating Student Council",
                      "LCO": "League of Campus Organization",
                      "USG": "University Student Government",
                      "TGP": "The Gold Panicles",
                      "USED": "University Student Enterprise Development"
                    }[selectedTemplateOrg]
                  }
                </h3>
                
                <div className="grid grid-cols-1 gap-6">
                  {/* Fiscal Forms */}
                  <Card className="p-6 border-t-4" style={{ borderTopColor: "#d4af37" }}>
                    <h4 className="text-lg font-semibold mb-4" style={{ color: "#003b27" }}>
                      Fiscal Forms
                    </h4>
                    {uploadedTemplates[selectedTemplateOrg]?.fiscal ? (
                      <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6 text-center">
                        <Download className="h-10 w-10 mx-auto mb-2 text-green-600" />
                        <p className="text-sm text-gray-600 mb-2">
                          {uploadedTemplates[selectedTemplateOrg].fiscal?.fileName}
                        </p>
                        {uploadedTemplates[selectedTemplateOrg].fiscal?.fileUrl?.includes('drive.google.com') || 
                         uploadedTemplates[selectedTemplateOrg].fiscal?.fileUrl?.includes('docs.google.com') ? (
                          <Button
                            className="w-full mt-2"
                            style={{ backgroundColor: "#003b27" }}
                            onClick={() => {
                              const url = uploadedTemplates[selectedTemplateOrg]?.fiscal?.fileUrl;
                              if (url) {
                                window.open(url, "_blank");
                              }
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Link
                          </Button>
                        ) : (
                          <Button
                            className="w-full mt-2"
                            style={{ backgroundColor: "#003b27" }}
                            onClick={() => {
                              const url = uploadedTemplates[selectedTemplateOrg]?.fiscal?.fileUrl;
                              if (url) {
                                window.open(url, '_blank');
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Open Link
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Download className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600 mb-4">
                          No template available yet
                        </p>
                        <p className="text-xs text-gray-400">
                          OSLD has not uploaded a template for this organization
                        </p>
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
            </DialogHeader>
            <p className="text-gray-600">Are you sure you want to logout?</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: "#003b27" }}
                onClick={() => {
                  localStorage.removeItem("userEmail");
                  localStorage.removeItem("userPassword");
                  window.location.href = "/";
                }}
              >
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render Request to Conduct Activity Section
  if (activeNav === "Request to Conduct Activity") {
    const sdgOptions = [
      "1. No Poverty",
      "2. Zero Hunger",
      "3. Good Health and Well-being",
      "4. Quality Education",
      "5. Gender Equality",
      "6. Clean Water and Sanitation",
      "7. Affordable and Clean Energy",
      "8. Decent Work and Economic Growth",
      "9. Industry, Innovation and Infrastructure",
      "10. Reduced Inequalities",
      "11. Sustainable Cities and Communities",
      "12. Responsible Consumption and Production",
      "13. Climate Action",
      "14. Life Below Water",
      "15. Life on Land",
      "16. Peace and Justice",
      "17. Partnerships for the Goals",
    ];

    const likhaOptions = [
      "Launchpad of Global Talents and Innovators",
      "Interdependence and High Impact Coalitions",
      "Knowledge Co-creation, and Technopreneurship",
      "Hub for Academic Excellence & Innovation",
      "Accelerated Administrative Systems and Digital Transformation",
    ];

    const handleSubmitActivity = async () => {
      // Check if account is on hold
      if (isOnHold) {
        setIsOnHoldDialogOpen(true);
        return;
      }

      // Validate all required fields
      const errors = {
        title: !activityTitle,
        date: !activityDate,
        recurrenceType: !activityRecurrenceType,
        venue: !activityVenue,
        participants: !activityParticipants,
        funds: !activityFunds,
        budget: !activityBudget,
        sdg: !activitySDG,
        likha: !activityLIKHA,
        designLink: !activityDesignLink || !isValidGdriveLink(activityDesignLink)
      };
      
      setActivityErrors(errors);
      
      if (Object.values(errors).some(error => error)) {
        return;
      }
      
      try {
        // Determine target organization based on current org
        // LSG → USG, LCO/USG/GSC/USED/TGP → OSLD, AO (Accredited Orgs) → LCO
        let targetOrg = 'LCO'; // Default for AO (Accredited Orgs)
        if (orgShortName === 'LSG') {
          targetOrg = 'USG';
        } else if (['LCO', 'USG', 'GSC', 'USED', 'TGP'].includes(orgShortName)) {
          targetOrg = 'OSLD';
        }

        // Combine date and recurrence type
        const startDateStr = activityDate ? format(activityDate, 'PPP') : '';
        const endDateStr = activityEndDate ? format(activityEndDate, 'PPP') : '';
        const combinedDuration = `${startDateStr} - ${endDateStr} (${activityRecurrenceType})`;

        // Save submission to database
        console.log('Saving activity design link:', activityDesignLink);
        const { data: submissionData, error: dbError } = await supabase
          .from('submissions')
          .insert({
            organization: orgShortName,
            submission_type: 'Request to Conduct Activity',
            activity_title: activityTitle,
            activity_duration: combinedDuration,
            activity_venue: activityVenue,
            activity_participants: activityParticipants,
            activity_funds: activityFunds,
            activity_budget: activityBudget,
            activity_sdg: activitySDG,
            activity_likha: activityLIKHA,
            file_url: activityDesignLink,
            file_name: 'Google Drive Folder Link',
            status: 'Pending',
            submitted_to: targetOrg
          })
          .select()
          .single();
        console.log('Saved submission data:', submissionData);

        if (dbError) throw dbError;

        // Create notification for target organization (reuse targetOrg from above)
        const orgFullNames: Record<string, string> = {
          "OSLD": "Office of Student Life and Development",
          "AO": "Accredited Organizations",
          "LSG": "Local Student Government",
          "GSC": "Graduating Student Council",
          "LCO": "League of Campus Organization",
          "USG": "University Student Government",
          "TGP": "The Gold Panicles",
          "USED": "University Student Enterprise Development"
        };
        
        await supabase
          .from('notifications')
          .insert({
            event_id: submissionData.id,
            event_title: `New Request from ${orgFullNames[orgShortName] || orgShortName}`,
            event_description: `${orgFullNames[orgShortName] || orgShortName} submitted a Request to Conduct Activity titled "${activityTitle}". Check it out!`,
            created_by: orgShortName,
            target_org: targetOrg
          });

        setShowSuccessDialog(true);
        setSuccessSubmissionType("Request Activity");
        setHasPendingSubmission(true);
        setPendingSubmissionStatus('Pending');
        handleCancelActivity();
      } catch (error) {
        console.error('Error submitting activity:', error);
        alert('Failed to submit activity request. Please try again.');
      }
    };

    const handleCancelActivity = () => {
      setActivityTitle("");
      setActivityDate(undefined);
      setActivityEndDate(undefined);
      setActivityRecurrenceType("");
      setActivityVenue("");
      setActivityParticipants("");
      setActivityFunds("");
      setActivityBudget("");
      setActivitySDG("");
      setActivityLIKHA("");
      setActivityDesignLink("");
    };

    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Mobile Menu Button */}
        <Button
          className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          style={{ backgroundColor: "#003b27" }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
        </Button>

        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
                style={{ ringColor: "#d4af37" }}
              >
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt="Organization Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  {orgShortName}
                </h1>
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item ? { backgroundColor: "#d4af37" } : undefined
                }
                variant={activeNav === item ? "default" : "ghost"}
              >
                {item}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start mb-2 text-white hover:bg-[#d4af37] hover:text-[#003b27]"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 pt-16 lg:pt-0 h-screen overflow-hidden">
          <div className="p-6 h-full flex flex-col">
            <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
              {/* Logo and Description */}
              <div className="text-center mb-4">
                <div className="flex items-center justify-center mb-2">
                  <div
                    className="h-14 w-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#003b27" }}
                  >
                    <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
                <h2
                  className="text-2xl font-bold"
                  style={{ color: "#003b27" }}
                >
                  Request to Conduct Activity
                </h2>
                <p className="text-slate-600 text-sm mt-1">Submit your activity request for review and approval</p>
              </div>

              {isOnHold && (
                <div className="mb-4 p-3 rounded-lg border bg-orange-50 border-orange-300">
                  <p className="font-medium text-orange-800 text-sm">
                    ⚠️ Your account is currently on hold due to pending requirements. You cannot submit new activity requests until you complete your pending dues.
                  </p>
                </div>
              )}

              <Card className="p-6 shadow-xl border-t-4 flex-1 overflow-hidden flex flex-col" style={{ borderTopColor: "#d4af37" }}>
              <div className="overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Activity Title */}
                <div className="space-y-1.5">
                  <Label className={`text-sm font-medium ${activityErrors.title ? 'text-red-500' : 'text-gray-700'}`}>Activity Title <span className="text-red-500">*</span></Label>
                  <Input
                    value={activityTitle}
                    onChange={(e) => setActivityTitle(e.target.value)}
                    className={`${activityErrors.title ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}
                  />
                  {activityErrors.title && (
                    <p className="text-red-500 text-xs">Please fill up this field</p>
                  )}
                </div>

                {/* Duration/Date */}
                <div className="space-y-1.5">
                  <Label className={`text-sm font-medium ${activityErrors.date ? 'text-red-500' : 'text-gray-700'}`}>Duration/Date <span className="text-red-500">*</span></Label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Start Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${activityErrors.date ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {activityDate ? format(activityDate, "PPP") : <span>Start date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={activityDate}
                          onSelect={setActivityDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* End Date Picker */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full justify-start text-left font-normal ${activityErrors.date ? 'border-red-500' : 'border-gray-300'}`}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {activityEndDate ? format(activityEndDate, "PPP") : <span>End date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={activityEndDate}
                          onSelect={setActivityEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    {/* Recurrence Type */}
                    <Select value={activityRecurrenceType} onValueChange={setActivityRecurrenceType}>
                      <SelectTrigger className={`${activityErrors.recurrenceType ? 'border-red-500' : 'border-gray-300'}`}>
                        <SelectValue placeholder="Recurrence" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Day(s)">Day(s)</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Every year">Every year</SelectItem>
                        <SelectItem value="1st Semester">1st Semester</SelectItem>
                        <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(activityErrors.date || activityErrors.recurrenceType) && (
                    <p className="text-red-500 text-xs">Please fill up both fields</p>
                  )}
                </div>

                {/* Venue/Platform */}
                <div className="space-y-1.5">
                  <Label className={`text-sm font-medium ${activityErrors.venue ? 'text-red-500' : 'text-gray-700'}`}>Venue/Platform <span className="text-red-500">*</span></Label>
                  <Input
                    value={activityVenue}
                    onChange={(e) => setActivityVenue(e.target.value)}
                    className={`${activityErrors.venue ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}
                  />
                  {activityErrors.venue && (
                    <p className="text-red-500 text-xs">Please fill up this field</p>
                  )}
                </div>

                {/* Target Participants */}
                <div className="space-y-1.5">
                  <Label className={`text-sm font-medium ${activityErrors.participants ? 'text-red-500' : 'text-gray-700'}`}>Target Participants <span className="text-red-500">*</span></Label>
                  <Input
                    value={activityParticipants}
                    onChange={(e) => setActivityParticipants(e.target.value)}
                    className={`${activityErrors.participants ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}
                  />
                  {activityErrors.participants && (
                    <p className="text-red-500 text-xs">Please fill up this field</p>
                  )}
                </div>

                {/* Source of Funds */}
                <div className="space-y-1.5">
                  <Label className={`text-sm font-medium ${activityErrors.funds ? 'text-red-500' : 'text-gray-700'}`}>
                    Source of Funds <span className="text-red-500">*</span>
                  </Label>
                  <Select value={activityFunds} onValueChange={setActivityFunds}>
                    <SelectTrigger className={`${activityErrors.funds ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}>
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="College Fee/Membership Fee">College Fee/Membership Fee</SelectItem>
                      <SelectItem value="IGF/Admin Project Fee Fund">IGF/Admin Project Fee Fund</SelectItem>
                      <SelectItem value="Sponsorship/Donation">Sponsorship/Donation</SelectItem>
                      <SelectItem value="IGP/Merch">IGP/Merch</SelectItem>
                    </SelectContent>
                  </Select>
                  {activityErrors.funds && (
                    <p className="text-red-500 text-xs">Please fill up this field</p>
                  )}
                </div>

                {/* Budgetary Requirements */}
                <div className="space-y-1.5">
                  <Label className={`text-sm font-medium ${activityErrors.budget ? 'text-red-500' : 'text-gray-700'}`}>
                    Budgetary Requirements <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={activityBudget}
                    onChange={(e) => setActivityBudget(e.target.value)}
                    className={`${activityErrors.budget ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}
                    placeholder="Enter amount"
                  />
                  {activityErrors.budget && (
                    <p className="text-red-500 text-xs">Please fill up this field</p>
                  )}
                </div>

                {/* SDG's */}
                <div className="space-y-1.5">
                  <Label className={`text-sm font-medium ${activityErrors.sdg ? 'text-red-500' : 'text-gray-700'}`}>SDG's <span className="text-red-500">*</span></Label>
                  <Select value={activitySDG} onValueChange={setActivitySDG}>
                    <SelectTrigger className={`${activityErrors.sdg ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}>
                      <SelectValue placeholder="Select SDG" />
                    </SelectTrigger>
                    <SelectContent>
                      {sdgOptions.map((sdg) => (
                        <SelectItem key={sdg} value={sdg}>
                          {sdg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activityErrors.sdg && (
                    <p className="text-red-500 text-xs">Please fill up this field</p>
                  )}
                </div>

                {/* LIKHA AGENDA */}
                <div className="space-y-1.5">
                  <Label className={`text-sm font-medium ${activityErrors.likha ? 'text-red-500' : 'text-gray-700'}`}>LIKHA AGENDA <span className="text-red-500">*</span></Label>
                  <Select value={activityLIKHA} onValueChange={setActivityLIKHA}>
                    <SelectTrigger className={`${activityErrors.likha ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}>
                      <SelectValue placeholder="Select LIKHA Agenda" />
                    </SelectTrigger>
                    <SelectContent>
                      {likhaOptions.map((likha) => (
                        <SelectItem key={likha} value={likha}>
                          {likha}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activityErrors.likha && (
                    <p className="text-red-500 text-xs">Please fill up this field</p>
                  )}
                </div>
              </div>

              {/* Upload Google Drive Link */}
              <div className="mt-5 space-y-1.5">
                <Label className={`text-sm font-medium ${activityErrors.designLink ? 'text-red-500' : 'text-gray-700'}`}>
                  Google Drive Folder Link <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="url"
                  value={activityDesignLink}
                  onChange={(e) => setActivityDesignLink(e.target.value)}
                  className={`${activityErrors.designLink ? 'border-red-500' : 'border-gray-300'} focus:border-[#003b27] focus:ring-[#003b27]`}
                  placeholder="Paste your Google Drive folder link here"
                />
                {activityDesignLink && isValidGdriveLink(activityDesignLink) && (
                  <div className="flex items-center gap-2 text-green-600 text-xs">
                    <CheckCircle className="h-3 w-3" />
                    <span>Valid Google Drive link</span>
                  </div>
                )}
                {activityErrors.designLink && (
                  <p className="text-red-500 text-xs">Please provide a valid Google Drive link</p>
                )}
              </div>

              {/* Info Card */}
              <Card className="mt-4 bg-blue-50 border-blue-200">
                <div className="p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-800">
                    <p className="font-semibold mb-1">Important Reminder</p>
                    <p>Please ensure your Google Drive folder contains the following documents:</p>
                    <p className="mt-1">• Activity Design • Budgetary Requirement • Resolution for Collection • Budget Proposal</p>
                  </div>
                </div>
              </Card>

              {/* Submit and Cancel Buttons */}
              <div className="flex gap-4 mt-4">
                <Button
                  onClick={handleSubmitActivity}
                  className="flex-1 h-10 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: isOnHold ? "#9ca3af" : "#003b27" }}
                  disabled={isOnHold}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Report
                </Button>
                <Button
                  onClick={handleCancelActivity}
                  className="flex-1 h-10 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: "#ef4444" }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
              </div>
            </Card>
            </div>
          </div>
        </div>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                Confirm Logout
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-base text-gray-700">
                Are you sure you want to logout?
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsLogoutDialogOpen(false)}
                className="flex-1"
              >
                No
              </Button>
              <Button
                onClick={handleLogout}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Yes, Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Submission Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-green-600">
                {successSubmissionType === "Accomplishment Report" 
                  ? "Accomplishment Report Submitted Successfully"
                  : successSubmissionType === "Liquidation Report"
                  ? "Liquidation Report Submitted Successfully"
                  : "Request Submitted Successfully"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                {successSubmissionType === "Accomplishment Report" 
                  ? "Your accomplishment report has been submitted successfully. Please wait for it to be reviewed."
                  : successSubmissionType === "Liquidation Report"
                  ? "Your liquidation report has been submitted successfully. Please wait for it to be reviewed."
                  : "Your activity request has been submitted successfully. Please wait for it to be reviewed."}
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowSuccessDialog(false)}
                style={{ backgroundColor: "#003b27" }}
              >
                Okay
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render Accomplishment Report Section
  if (activeNav === "Accomplishment Report") {
    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Mobile Menu Button */}
        <Button
          className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          style={{ backgroundColor: "#003b27" }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
        </Button>

        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
                style={{ ringColor: "#d4af37" }}
              >
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt="Organization Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  {orgShortName}
                </h1>
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item ? { backgroundColor: "#d4af37" } : undefined
                }
                variant={activeNav === item ? "default" : "ghost"}
              >
                {item}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start mb-2 text-white hover:bg-[#d4af37] hover:text-[#003b27]"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-lg">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: "#003b27" }}>
                  Accomplishment Report
                </h2>
                <p className="text-gray-600 text-sm lg:text-base">
                  Submit your activity accomplishment report for review
                </p>
              </div>

              {/* Form Card */}
              <Card className="border-t-4 border-[#d4af37] shadow-xl bg-white rounded-xl overflow-hidden">
                <div className="p-8 space-y-8">
                  {/* Activity Title Section */}
                  <div className="space-y-3">
                    <Label className={`text-base font-semibold flex items-center gap-2 ${accomplishmentErrors.title ? 'text-red-500' : ''}`} style={accomplishmentErrors.title ? {} : { color: "#003b27" }}>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Activity Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={accomplishmentActivityTitle}
                      onChange={(e) => setAccomplishmentActivityTitle(e.target.value)}
                      className={`h-12 text-base border-2 ${accomplishmentErrors.title ? 'border-red-500' : 'focus:border-[#d4af37]'} transition-colors`}
                      placeholder="Enter the activity title"
                    />
                    {accomplishmentErrors.title && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* Google Drive Link Section */}
                  <div className="space-y-3">
                    <Label className={`text-base font-semibold flex items-center gap-2 ${accomplishmentErrors.link ? 'text-red-500' : ''}`} style={accomplishmentErrors.link ? {} : { color: "#003b27" }}>
                      <Link2 className="h-5 w-5 text-blue-600" />
                      Google Drive Link <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        value={accomplishmentGdriveLink}
                        onChange={(e) => setAccomplishmentGdriveLink(e.target.value)}
                        className={`h-12 text-base border-2 transition-colors pl-10 ${
                          accomplishmentErrors.link
                            ? "border-red-500"
                            : accomplishmentGdriveLink && isValidGdriveLink(accomplishmentGdriveLink)
                            ? "border-green-400 bg-green-50"
                            : "focus:border-[#d4af37]"
                        }`}
                        placeholder="Paste your Google Drive link here"
                      />
                      <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    {accomplishmentGdriveLink && isValidGdriveLink(accomplishmentGdriveLink) && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Valid Google Drive link</span>
                      </div>
                    )}
                    {accomplishmentErrors.link && (
                      <p className="text-red-500 text-xs">Please provide a valid Google Drive link</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Share a Google Drive folder or file containing your accomplishment report
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6">
                    <Button
                      onClick={handleAccomplishmentSubmit}
                      className="flex-1 h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#003b27" }}
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Report
                    </Button>
                    <Button
                      onClick={handleAccomplishmentCancel}
                      className="flex-1 h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#ef4444" }}
                    >
                      <X className="h-5 w-5 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Info Card */}
              <Card className="mt-6 bg-blue-50 border-blue-200">
                <div className="p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Important Reminder</p>
                    <p>Make sure your accomplishment report includes all required details and is in the proper format before submitting.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to logout?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsLogoutDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  window.location.href = "/";
                }}
                style={{ backgroundColor: "#003b27" }}
              >
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Submission Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-green-600">
                Accomplishment Report Submitted Successfully
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Your accomplishment report has been submitted successfully. Please wait for it to be reviewed.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowSuccessDialog(false)}
                style={{ backgroundColor: "#003b27" }}
              >
                Okay
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render Liquidation Report Section
  if (activeNav === "Liquidation Report") {
    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Mobile Menu Button */}
        <Button
          className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          style={{ backgroundColor: "#003b27" }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
        </Button>

        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
                style={{ ringColor: "#d4af37" }}
              >
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt="Organization Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  {orgShortName}
                </h1>
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item ? { backgroundColor: "#d4af37" } : undefined
                }
                variant={activeNav === item ? "default" : "ghost"}
              >
                {item}
              </Button>
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start mb-2 text-white hover:bg-[#d4af37] hover:text-[#003b27]"
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
              {/* Header Section */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold mb-2" style={{ color: "#003b27" }}>
                  Liquidation Report
                </h2>
                <p className="text-gray-600 text-sm lg:text-base">
                  Submit your financial liquidation report for review
                </p>
              </div>

              {/* Form Card */}
              <Card className="border-t-4 border-[#d4af37] shadow-xl bg-white rounded-xl overflow-hidden">
                <div className="p-8 space-y-8">
                  {/* Activity Title Section */}
                  <div className="space-y-3">
                    <Label className={`text-base font-semibold flex items-center gap-2 ${liquidationErrors.title ? 'text-red-500' : ''}`} style={liquidationErrors.title ? {} : { color: "#003b27" }}>
                      <CheckCircle className="h-5 w-5 text-indigo-600" />
                      Activity Title <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={liquidationActivityTitle}
                      onChange={(e) => setLiquidationActivityTitle(e.target.value)}
                      className={`h-12 text-base border-2 ${liquidationErrors.title ? 'border-red-500' : 'focus:border-[#d4af37]'} transition-colors`}
                      placeholder="Enter the activity title"
                    />
                    {liquidationErrors.title && (
                      <p className="text-red-500 text-xs">Please fill up this field</p>
                    )}
                  </div>

                  {/* Google Drive Link Section */}
                  <div className="space-y-3">
                    <Label className={`text-base font-semibold flex items-center gap-2 ${liquidationErrors.link ? 'text-red-500' : ''}`} style={liquidationErrors.link ? {} : { color: "#003b27" }}>
                      <Link2 className="h-5 w-5 text-blue-600" />
                      Google Drive Link <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        value={liquidationGdriveLink}
                        onChange={(e) => setLiquidationGdriveLink(e.target.value)}
                        className={`h-12 text-base border-2 transition-colors pl-10 ${
                          liquidationErrors.link
                            ? "border-red-500"
                            : liquidationGdriveLink && isValidGdriveLink(liquidationGdriveLink)
                            ? "border-green-400 bg-green-50"
                            : "focus:border-[#d4af37]"
                        }`}
                        placeholder="Paste your Google Drive link here"
                      />
                      <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    {liquidationGdriveLink && isValidGdriveLink(liquidationGdriveLink) && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" />
                        <span>Valid Google Drive link</span>
                      </div>
                    )}
                    {liquidationErrors.link && (
                      <p className="text-red-500 text-xs">Please provide a valid Google Drive link</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Share a Google Drive folder or file containing your liquidation report
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6">
                    <Button
                      onClick={handleLiquidationSubmit}
                      className="flex-1 h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#003b27" }}
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Report
                    </Button>
                    <Button
                      onClick={handleLiquidationCancel}
                      className="flex-1 h-12 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#ef4444" }}
                    >
                      <X className="h-5 w-5 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Info Card */}
              <Card className="mt-6 bg-blue-50 border-blue-200">
                <div className="p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Important Reminder</p>
                    <p>Ensure all financial details and receipts are included in your liquidation report before submission.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to logout?</p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsLogoutDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  window.location.href = "/";
                }}
                style={{ backgroundColor: "#003b27" }}
              >
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Submission Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-green-600">
                Liquidation Report Submitted Successfully
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Your liquidation report has been submitted successfully. Please wait for it to be reviewed.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setShowSuccessDialog(false)}
                style={{ backgroundColor: "#003b27" }}
              >
                Okay
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render Activity Logs Section
  if (activeNav === "Activity Logs") {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "Submitted":
          return "bg-blue-100 text-blue-800";
        case "Pending":
          return "bg-yellow-100 text-yellow-800";
        case "For Revision":
          return "bg-orange-100 text-orange-800";
        case "Approved":
          return "bg-green-100 text-green-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    };

    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Mobile Menu Button */}
        <Button
          className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          style={{ backgroundColor: "#003b27" }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
        </Button>

        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
                style={{ ringColor: "#d4af37" }}
              >
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt="Organization Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  {orgShortName}
                </h1>
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item ? { backgroundColor: "#d4af37" } : undefined
                }
                variant={activeNav === item ? "default" : "ghost"}
              >
                {item}
              </Button>
            ))}
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start mb-2 text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <h2
              className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8"
              style={{ color: "#003b27" }}
            >
              Activity Logs
            </h2>
            
            {/* Activity Logs Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-4 bg-[#003b27]">
                <h3 className="text-lg font-semibold text-white">My Logs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activityLogs.filter(log => log.organization === orgShortName).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                          No activity logs yet. Submissions will appear here once they are made.
                        </td>
                      </tr>
                    ) : (
                      activityLogs.filter(log => log.organization === orgShortName).map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.documentName}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{log.type}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                              {log.status === 'Approved' && log.submitted_to ? `Approved by ${log.submitted_to}` : 
                               log.status === 'For Revision' && log.submitted_to ? `For Revision by ${log.submitted_to}` : 
                               log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{log.date}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="text-xs bg-[#003b27] text-white hover:bg-[#002a1c]"
                                onClick={() => {
                                  setSelectedLog(log);
                                  setIsLogDetailOpen(true);
                                }}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs border-gray-300 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                                onClick={() => {
                                  setLogToDelete(log);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Other Organizations' Logs - Only for OSLD, LCO, and USG */}
            {(orgShortName === 'OSLD' || orgShortName === 'LCO' || orgShortName === 'USG') && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-[#003b27]">
                  <h3 className="text-lg font-semibold text-white">Other Organizations' Logs</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activityLogs.filter(log => log.organization !== orgShortName && log.submitted_to === orgShortName && (log.status === 'Approved' || log.status === 'For Revision')).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                            No processed submissions from other organizations.
                          </td>
                        </tr>
                      ) : (
                        activityLogs.filter(log => log.organization !== orgShortName && log.submitted_to === orgShortName && (log.status === 'Approved' || log.status === 'For Revision')).map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.documentName}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{log.type}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {{
                                "OSLD": "Office of Student Life and Development",
                                "AO": "Accredited Organizations",
                                "LSG": "Local Student Government",
                                "GSC": "Graduating Student Council",
                                "LCO": "League of Campus Organization",
                                "USG": "University Student Government",
                                "TGP": "The Gold Panicles",
                                "USED": "University Student Enterprise Development"
                              }[log.organization] || log.organization}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{log.date}</td>
                            <td className="px-6 py-4">
                              <Button
                                size="sm"
                                className="text-xs bg-[#003b27] text-white hover:bg-[#002a1c]"
                                onClick={() => {
                                  setSelectedLog(log);
                                  setIsLogDetailOpen(true);
                                }}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Activity Log Detail Dialog */}
        <Dialog open={isLogDetailOpen} onOpenChange={setIsLogDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold" style={{ color: "#003b27" }}>
                Activity Details
              </DialogTitle>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLog.status)}`}>
                    {selectedLog.status}
                  </span>
                </div>

                {selectedLog.status === 'For Revision' && selectedLog.revisionReason && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-800 font-medium mb-2">Revision Required</p>
                    <p className="text-gray-700">
                      You are advised to revise your request to conduct activity due to the following reasons:
                    </p>
                    <div className="mt-2 p-3 bg-white border rounded">
                      <p className="text-gray-800">{selectedLog.revisionReason}</p>
                    </div>
                    <p className="text-sm text-gray-600 italic mt-3">
                      Please stay updated for further announcements.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-[#003b27]/5 rounded-lg">
                  <h3 className="text-lg font-bold text-[#003b27]">{selectedLog.documentName}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedLog.type}</p>
                </div>

                {selectedLog.type !== 'Accomplishment Report' && selectedLog.type !== 'Liquidation Report' && selectedLog.type !== 'Letter of Appeal' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="font-medium">{selectedLog.activity_duration}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Venue</p>
                      <p className="font-medium">{selectedLog.activity_venue}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Participants</p>
                      <p className="font-medium">{selectedLog.activity_participants}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Source of Funds</p>
                      <p className="font-medium">₱{selectedLog.activity_funds}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">Budget</p>
                      <p className="font-medium">₱{selectedLog.activity_budget}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-xs text-gray-500">SDG</p>
                      <p className="font-medium">{selectedLog.activity_sdg}</p>
                    </div>
                    <div className="p-3 border rounded-lg col-span-2">
                      <p className="text-xs text-gray-500">LIKHA Agenda</p>
                      <p className="font-medium">{selectedLog.activity_likha}</p>
                    </div>
                  </div>
                )}

                <div className="p-4 border-2 border-dashed rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">
                        {selectedLog.type === 'Letter of Appeal' ? 'File for Appeal' : 
                         selectedLog.type === 'Accomplishment Report' ? 'Accomplishment Report File' :
                         selectedLog.type === 'Liquidation Report' ? 'Liquidation Report File' :
                         'Google Drive Folder Link'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedLog.type === 'Request to Conduct Activity' ? 'Contains: Activity Design, Budgetary Requirements, etc.' : 'View submitted file'}
                      </p>
                    </div>
                    <a href={selectedLog.fileUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" style={{ backgroundColor: "#003b27" }}>
                        Open Link
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLogDetailOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-600">
                Delete Activity Log
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">
                Are you sure you want to delete this activity log? This action cannot be undone.
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setLogToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteLog}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Confirm Logout</DialogTitle>
              <DialogDescription>
                Are you sure you want to logout?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsLogoutDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                style={{ backgroundColor: "#003b27" }}
                onClick={() => {
                  setIsLogoutDialogOpen(false);
                  window.location.href = "/";
                }}
              >
                Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render Officers Section
  if (activeNav === "Officers") {
    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Mobile Menu Button */}
        <Button
          className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          style={{ backgroundColor: "#003b27" }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
        </Button>

        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
                style={{ ringColor: "#d4af37" }}
              >
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt="Organization Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  {orgShortName}
                </h1>
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item ? { backgroundColor: "#d4af37" } : undefined
                }
                variant={activeNav === item ? "default" : "ghost"}
              >
                {item}
              </Button>
            ))}
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start mb-2 text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>
        </div>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <h2
              className="text-2xl lg:text-4xl font-bold mb-6 lg:mb-8"
              style={{ color: "#003b27" }}
            >
              Officers & Advisers
            </h2>

            <div className="space-y-8">
              {/* Advisers Section - FIRST */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    Advisers
                  </h3>
                  <Button
                    variant="outline"
                    onClick={openAddAdviserModal}
                    className="font-semibold border-2"
                    style={{ borderColor: "#003b27", color: "#003b27" }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Adviser
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {advisers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No advisers added yet
                    </p>
                  ) : (
                    advisers.map((adviser) => {
                      const positionParts = adviser.position.replace(/\s*adviser\s*/gi, '').split(" | ");
                      const yearsExp = positionParts[0] || "";
                      const expertise = positionParts[1] || "";
                      return (
                      <div
                        key={adviser.id}
                        className="p-6 rounded-lg border-2 bg-white shadow-md hover:shadow-lg transition-all"
                        style={{ borderColor: "#d4af37" }}
                      >
                        {adviser.image && (
                          <img
                            src={adviser.image}
                            alt={adviser.name}
                            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4"
                            style={{ borderColor: "#003b27" }}
                          />
                        )}
                        <div className="text-left space-y-2">
                          <p className="text-sm">
                            <span className="font-semibold text-gray-700">Name:</span>{" "}
                            <span className="text-gray-900">{adviser.name}</span>
                          </p>
                          {yearsExp && (
                            <p className="text-sm">
                              <span className="font-semibold text-gray-700">Years as Adviser:</span>{" "}
                              <span className="text-gray-900">{yearsExp}</span>
                            </p>
                          )}
                          {expertise && (
                            <div className="text-sm mb-4">
                              <span className="font-semibold text-gray-700">Field of Expertise:</span>{" "}
                              <div className="mt-1">
                                {expertise.split(/[,;]/).map((exp: string, idx: number) => (
                                  <span key={idx} className="inline-block bg-gray-100 px-2 py-1 rounded text-xs mr-1 mb-1">
                                    {exp.trim()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {!expertise && <div className="mb-4" />}
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditAdviserModal(adviser)}
                              className="border-2 font-medium"
                              style={{ borderColor: "#003b27", color: "#003b27" }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeAdviser(adviser.id)}
                              className="border-2 font-medium border-red-500 text-red-500 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </Card>

              {/* Officers Section - SECOND */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    Officers
                  </h3>
                  <Button
                    variant="outline"
                    onClick={openAddOfficerModal}
                    className="font-semibold border-2"
                    style={{ borderColor: "#003b27", color: "#003b27" }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Officer
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {officers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No officers added yet
                    </p>
                  ) : (
                    officers.map((officer) => {
                      const parts = officer.position.split(" | ");
                      const role = parts[0] || "";
                      const program = parts[1] || "";
                      const idNumber = parts[2] || "";
                      return (
                      <div
                        key={officer.id}
                        className="p-6 rounded-lg border-2 bg-white shadow-md hover:shadow-lg transition-all"
                        style={{ borderColor: "#d4af37" }}
                      >
                        {officer.image && (
                          <img
                            src={officer.image}
                            alt={officer.name}
                            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4"
                            style={{ borderColor: "#003b27" }}
                          />
                        )}
                        <div className="text-left space-y-2">
                          <p className="text-sm">
                            <span className="font-semibold text-gray-700">Name:</span>{" "}
                            <span className="text-gray-900">{officer.name}</span>
                          </p>
                          {role && (
                            <p className="text-sm">
                              <span className="font-semibold text-gray-700">Role:</span>{" "}
                              <span className="text-gray-900">{role}</span>
                            </p>
                          )}
                          {program && (
                            <p className="text-sm">
                              <span className="font-semibold text-gray-700">Program and Year:</span>{" "}
                              <span className="text-gray-900">{program}</span>
                            </p>
                          )}
                          {idNumber && (
                            <p className="text-sm mb-4">
                              <span className="font-semibold text-gray-700">ID Number:</span>{" "}
                              <span className="text-gray-900">{idNumber}</span>
                            </p>
                          )}
                          {!idNumber && <div className="mb-4" />}
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditOfficerModal(officer)}
                              className="border-2 font-medium"
                              style={{ borderColor: "#003b27", color: "#003b27" }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeOfficer(officer.id)}
                              className="border-2 font-medium border-red-500 text-red-500 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </Card>

              {/* Social Media & Contact - THIRD */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3
                    className="text-2xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    Social Media & Contact
                  </h3>
                  <Button
                    variant="outline"
                    onClick={openSocialContactModal}
                    className="font-semibold border-2"
                    style={{ borderColor: "#003b27", color: "#003b27" }}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </div>
                <div className="space-y-3">
                  {platforms.facebook && (
                    <p className="text-sm">
                      <span className="font-semibold text-gray-700">Facebook:</span>{" "}
                      <a
                        href={platforms.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {platforms.facebook}
                      </a>
                    </p>
                  )}
                  {contactEmail && (
                    <p className="text-sm">
                      <span className="font-semibold text-gray-700">Email:</span>{" "}
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-gray-900 hover:underline"
                      >
                        {contactEmail}
                      </a>
                    </p>
                  )}
                  {contactPhone && (
                    <p className="text-sm">
                      <span className="font-semibold text-gray-700">Contact Number:</span>{" "}
                      <a
                        href={`tel:${contactPhone}`}
                        className="text-gray-900 hover:underline"
                      >
                        {contactPhone}
                      </a>
                    </p>
                  )}
                  {!platforms.facebook && !contactEmail && !contactPhone && (
                    <p className="text-gray-500 text-center py-8">
                      No contact information added yet
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Logout Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: "#003b27" }}>
                Confirm Logout
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-base text-gray-700">
                Are you sure you want to logout?
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsLogoutDialogOpen(false)}
                className="flex-1"
              >
                No
              </Button>
              <Button
                onClick={handleLogout}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Yes, Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Officer Modal */}
        <Dialog open={isOfficerModalOpen} onOpenChange={setIsOfficerModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                {editingOfficer ? "Edit Officer" : "Add Officer"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                  placeholder="Enter officer name"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Input
                  value={officerRole}
                  onChange={(e) => setOfficerRole(e.target.value)}
                  placeholder="Enter role (e.g., President, Secretary)"
                />
              </div>
              <div>
                <Label>Program and Year</Label>
                <Input
                  value={officerProgram}
                  onChange={(e) => setOfficerProgram(e.target.value)}
                  placeholder="Enter program and year (e.g., BS Information System - 4)"
                />
              </div>
              <div>
                <Label>ID Number</Label>
                <Input
                  value={officerIdNumber}
                  onChange={(e) => setOfficerIdNumber(e.target.value)}
                  placeholder="Enter ID number"
                />
              </div>
              <div>
                <Label>Upload Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "officer")}
                  className="cursor-pointer"
                />
                {officerImage && (
                  <img
                    src={officerImage}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover mt-2 border-2"
                    style={{ borderColor: "#003b27" }}
                  />
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOfficerModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveOfficer}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                {editingOfficer ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Adviser Modal */}
        <Dialog open={isAdviserModalOpen} onOpenChange={setIsAdviserModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                {editingAdviser ? "Edit Adviser" : "Add Adviser"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={adviserName}
                  onChange={(e) => setAdviserName(e.target.value)}
                  placeholder="Enter adviser name"
                />
              </div>
              <div>
                <Label>Number of Year/s being the Adviser</Label>
                <Input
                  value={adviserYearsExperience}
                  onChange={(e) => setAdviserYearsExperience(e.target.value)}
                  placeholder="Enter number of years (e.g., 3 years)"
                />
              </div>
              <div>
                <Label>Field of Expertise</Label>
                <div className="space-y-2">
                  {adviserExpertise.map((expertise, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={expertise}
                        onChange={(e) => {
                          const newExpertise = [...adviserExpertise];
                          newExpertise[index] = e.target.value;
                          setAdviserExpertise(newExpertise);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setAdviserExpertise([...adviserExpertise, ""]);
                          }
                        }}
                        placeholder="Enter field of expertise"
                      />
                      {adviserExpertise.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdviserExpertise(adviserExpertise.filter((_, i) => i !== index));
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {adviserExpertise.length === 0 && (
                    <Input
                      value=""
                      onChange={(e) => setAdviserExpertise([e.target.value])}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setAdviserExpertise([...adviserExpertise, ""]);
                        }
                      }}
                      placeholder="Enter field of expertise"
                    />
                  )}
                  <p className="text-xs text-gray-500">Press Enter to add another expertise</p>
                </div>
              </div>
              <div>
                <Label>Upload Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "adviser")}
                  className="cursor-pointer"
                />
                {adviserImage && (
                  <img
                    src={adviserImage}
                    alt="Preview"
                    className="w-20 h-20 rounded-full object-cover mt-2 border-2"
                    style={{ borderColor: "#003b27" }}
                  />
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAdviserModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveAdviser}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                {editingAdviser ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Social & Contact Modal */}
        <Dialog open={isSocialContactModalOpen} onOpenChange={setIsSocialContactModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                Edit Social Media & Contact
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Facebook Page Link</Label>
                <Input
                  value={editFacebookLink}
                  onChange={(e) => setEditFacebookLink(e.target.value)}
                  placeholder="Enter Facebook page URL"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editContactEmail}
                  onChange={(e) => setEditContactEmail(e.target.value)}
                  placeholder="Enter contact email"
                />
              </div>
              <div>
                <Label>Contact Number</Label>
                <Input
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  placeholder="Enter contact number"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsSocialContactModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSocialContact}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render Organizations Section
  if (activeNav === "Organizations") {
    return (
      <OrganizationsPage
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sidebarTitle={orgShortName}
        sidebarSubtitle={orgName}
        orgLogo={orgLogo}
        navItems={navItems}
      />
    );
  }

  // Render Submissions Section (LCO and USG only) - Show submission content only
  const submissionTypes = [
    "Request to Conduct Activity",
    "Accomplishment Report",
    "Liquidation Report",
  ];

  // Render Profile Section
  if (showProfile) {
    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Mobile Menu Button */}
        <Button
          className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          style={{ backgroundColor: "#003b27" }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
        </Button>

        {/* Sidebar */}
        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
                style={{ ringColor: "#d4af37" }}
              >
                {orgLogo ? (
                  <img
                    src={orgLogo}
                    alt="Organization Logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  {orgShortName}
                </h1>
                <p className="text-xs text-white/60 mt-1">{orgName}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {navItems.map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setShowProfile(false);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item ? { backgroundColor: "#d4af37" } : undefined
                }
                variant={activeNav === item ? "default" : "ghost"}
              >
                {item}
              </Button>
            ))}
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start mb-2 text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>
        </div>

        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

        {/* Profile Content */}
        <div className="flex-1 overflow-auto pt-16 lg:pt-0">
          <div className="p-4 lg:p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfile(false)}
                  className="hover:bg-gray-200"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </div>

            <div className="max-w-5xl mx-auto">
              <h2
                className="text-4xl font-bold mb-8"
                style={{ color: "#003b27" }}
              >
                Profile
              </h2>

              <div className="space-y-6">
                {/* Logo Upload Card */}
                <Card
                  className="p-8 shadow-xl border-0 bg-gradient-to-br from-white to-gray-50"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#003b27" }}
                    >
                      <ImageIcon className="h-5 w-5 text-white" />
                    </div>
                    <h3
                      className="text-2xl font-bold"
                      style={{ color: "#003b27" }}
                    >
                      Organization Logo
                    </h3>
                  </div>
                  
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Logo Preview */}
                    <div className="flex-shrink-0">
                      {orgLogo ? (
                        <div className="relative group">
                          <div
                            className="w-40 h-40 rounded-full overflow-hidden shadow-lg ring-4 ring-offset-2"
                            style={{ ringColor: "#d4af37" }}
                          >
                            <img
                              src={orgLogo}
                              alt="Organization Logo"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <Button
                            onClick={async () => {
                              try {
                                // Delete the logo from storage
                                const fileName = `${orgShortName}_logo`;
                                const { data: files } = await supabase.storage
                                  .from('osld-files')
                                  .list('logos', { search: fileName });
                                
                                if (files && files.length > 0) {
                                  await supabase.storage
                                    .from('osld-files')
                                    .remove([`logos/${files[0].name}`]);
                                }
                                setOrgLogo("");
                                toast({
                                  title: "Success",
                                  description: "Logo removed successfully",
                                });
                              } catch (error) {
                                console.error("Error removing logo:", error);
                                setOrgLogo("");
                              }
                            }}
                            variant="destructive"
                            size="icon"
                            className="absolute -top-3 -right-3 rounded-full w-10 h-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="w-40 h-40 rounded-full border-3 border-dashed flex flex-col items-center justify-center bg-gray-50 transition-all duration-300 hover:bg-gray-100"
                          style={{ borderColor: "#003b27" }}
                        >
                          <ImageIcon className="h-12 w-12 text-gray-300 mb-2" />
                          <span className="text-sm text-gray-400">No logo</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Upload Controls */}
                    <div className="flex-1 text-center md:text-left">
                      <h4 className="text-lg font-semibold text-gray-700 mb-2">Choose File</h4>
                      <p className="text-sm text-gray-500 mb-4">
                        Supported: PNG, JPG, GIF (Max 5MB)
                      </p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const fileExt = file.name.split('.').pop();
                              const fileName = `${orgShortName}_logo.${fileExt}`;
                              const filePath = `logos/${fileName}`;

                              const { error: uploadError } = await supabase.storage
                                .from('osld-files')
                                .upload(filePath, file, { upsert: true });

                              if (uploadError) throw uploadError;

                              const { data } = supabase.storage
                                .from('osld-files')
                                .getPublicUrl(filePath);

                              setOrgLogo(data.publicUrl);
                              toast({
                                title: "Success",
                                description: "Logo uploaded successfully!",
                              });
                            } catch (error: any) {
                              console.error("Error uploading logo:", error);
                              toast({
                                title: "Error",
                                description: "Failed to upload logo",
                                variant: "destructive",
                              });
                            }
                          }
                        }}
                        className="max-w-xs"
                      />
                    </div>
                  </div>
                </Card>

                {/* Account Settings Card */}
                <Card
                  className="p-8 shadow-lg border-l-4"
                  style={{ borderLeftColor: "#d4af37" }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3
                      className="text-2xl font-bold"
                      style={{ color: "#003b27" }}
                    >
                      Account Settings
                    </h3>
                    <Button
                      onClick={() => setIsEditAccountModalOpen(true)}
                      className="font-semibold"
                      style={{ backgroundColor: "#003b27" }}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Account
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-base font-medium text-gray-600">
                        Email
                      </span>
                      <span className="font-semibold text-lg">
                        {currentEmail}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b">
                      <span className="text-base font-medium text-gray-600">
                        Password
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {showPassword ? currentPassword : "••••••••"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPassword(!showPassword)}
                          className="h-8 w-8"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Accreditation Status */}
                <Card
                  className="p-8 shadow-lg border-l-4"
                  style={{ borderLeftColor: "#d4af37" }}
                >
                  <h3
                    className="text-2xl font-bold mb-6"
                    style={{ color: "#003b27" }}
                  >
                    Accreditation Status
                  </h3>
                  <div className="flex items-center gap-4">
                    <Label className="text-lg font-medium min-w-[100px]">
                      Status:
                    </Label>
                    <span className="text-lg font-semibold text-green-600">
                      Active
                    </span>
                  </div>
                </Card>





                {/* Documents */}
                <div className="grid md:grid-cols-2 gap-6">
                  <Card
                    className="p-8 shadow-lg border-l-4"
                    style={{ borderLeftColor: "#d4af37" }}
                  >
                    <h3
                      className="text-xl font-bold mb-4"
                      style={{ color: "#003b27" }}
                    >
                      Resolution
                    </h3>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          setResolutionFiles(prev => [...prev, ...Array.from(files)]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can upload multiple PDF files</p>
                    {resolutionFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {resolutionFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <span className="text-sm text-gray-600">✓ {file.name}</span>
                            <button
                              type="button"
                              onClick={() => setResolutionFiles(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  <Card
                    className="p-8 shadow-lg border-l-4"
                    style={{ borderLeftColor: "#d4af37" }}
                  >
                    <h3
                      className="text-xl font-bold mb-4"
                      style={{ color: "#003b27" }}
                    >
                      Annual Action Plan
                    </h3>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          setActionPlanFiles(prev => [...prev, ...Array.from(files)]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can upload multiple PDF files</p>
                    {actionPlanFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {actionPlanFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                            <span className="text-sm text-gray-600">✓ {file.name}</span>
                            <button
                              type="button"
                              onClick={() => setActionPlanFiles(prev => prev.filter((_, i) => i !== index))}
                              className="text-red-500 hover:text-red-700 text-sm font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>



                <Button
                  onClick={handleSaveProfile}
                  className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: "#003b27" }}
                >
                  Save Profile
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Confirmation Dialog */}
        <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                Confirm Logout
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-base text-gray-700">
                Are you sure you want to logout?
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsLogoutDialogOpen(false)}
                className="flex-1"
              >
                No
              </Button>
              <Button
                onClick={handleLogout}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Yes, Logout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Account Modal */}
        <Dialog open={isEditAccountModalOpen} onOpenChange={setIsEditAccountModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
                Edit Account
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentEmail" className="text-base font-medium">
                  Current Email
                </Label>
                <Input
                  id="currentEmail"
                  value={currentEmail}
                  disabled
                  className="text-base bg-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newEmail" className="text-base font-medium">
                  New Email
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email"
                    className="text-base flex-1"
                  />
                  <Button
                    onClick={handleSendVerification}
                    disabled={isVerificationSent}
                    style={{ backgroundColor: "#003b27" }}
                  >
                    {isVerificationSent ? "Sent" : "Verify"}
                  </Button>
                </div>
              </div>

              {isVerificationSent && (
                <div className="space-y-2">
                  <Label
                    htmlFor="verificationCode"
                    className="text-base font-medium"
                  >
                    Verification Code
                  </Label>
                  <Input
                    id="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="text-base"
                  />
                  <p className="text-sm text-gray-500">
                    Check your email for the verification code
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-base font-medium">
                  New Password (Optional)
                </Label>
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="text-base"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-sm"
                >
                  {showPassword ? "Hide" : "Show"} Password
                </Button>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditAccountModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setIsEditAccountModalOpen(false)}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Menu Button */}
      <Button
        className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
        style={{ backgroundColor: "#003b27" }}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
      </Button>

      {/* Sidebar */}
      <div
        className={`${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
        style={{ backgroundColor: "#003b27" }}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div
              className={`flex-shrink-0 ${orgLogo ? 'w-14 h-14' : 'w-12 h-12'} rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10`}
              style={{ ringColor: "#d4af37" }}
            >
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt="Organization Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                {orgShortName}
              </h1>
              <p className="text-xs text-white/60 mt-1">{orgName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          {navItems.map((item) => (
            <Button
              key={item}
              onClick={() => {
                setActiveNav(item);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full justify-start mb-2 text-left font-semibold transition-all whitespace-normal text-sm leading-tight py-3 h-auto ${
                activeNav === item
                  ? "text-[#003b27]"
                  : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
              }`}
              style={
                activeNav === item ? { backgroundColor: "#d4af37" } : undefined
              }
              variant={activeNav === item ? "default" : "ghost"}
            >
              {item}
            </Button>
          ))}
          <Button
            onClick={() => setIsLogoutDialogOpen(true)}
            className="w-full justify-start mb-2 text-left font-semibold transition-all text-white hover:bg-red-600"
            variant="ghost"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {activeNav === "Submissions" ? (
            <SubmissionsPage
              activeNav={activeNav}
              setActiveNav={setActiveNav}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              orgShortName={orgShortName}
              orgFullName={orgName}
              orgLogo={orgLogo}
              isEmbedded={true}
            />
          ) : coaLiquidationViewOrgs.map(org => activeNav === 
            (org === "USG" ? "University Student Government" : 
             org === "LSG" ? "Local Student Government" : 
             org === "AO" ? "Accredited Organizations" : 
             org === "GSC" ? "Graduating Student Council" : 
             org === "USED" ? "Student Entrepreneurship Development Unit" : "")).includes(true) && orgShortName === "COA" ? (
            <SubmissionsPage
              activeNav="Liquidation Report"
              setActiveNav={setActiveNav}
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              orgShortName={
                activeNav === "University Student Government" ? "USG" :
                activeNav === "Local Student Government" ? "LSG" :
                activeNav === "Accredited Organizations" ? "AO" :
                activeNav === "Graduating Student Council" ? "GSC" :
                activeNav === "Student Entrepreneurship Development Unit" ? "USED" : ""
              }
              orgFullName={activeNav}
              orgLogo=""
              isEmbedded={true}
              hideNavButtons={true}
            />
          ) : (
            <>
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <h2
              className="text-2xl lg:text-4xl font-bold"
              style={{ color: "#003b27" }}
            >
              {orgShortName} Dashboard
            </h2>
            <div className="flex items-center gap-3">
              <Popover
                open={showNotificationPopover}
                onOpenChange={setShowNotificationPopover}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full w-10 h-10 relative"
                    style={{ borderColor: "#d4af37", color: "#003b27" }}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4" align="end">
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className="font-semibold text-lg"
                      style={{ color: "#003b27" }}
                    >
                      Notifications
                    </h3>
                    {notifications.length > 0 && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-blue-600 hover:text-blue-800 h-7 px-2"
                          onClick={async () => {
                            const unreadNotifs = notifications.filter(n => !n.isRead);
                            for (const notif of unreadNotifs) {
                              await supabase
                                .from('notification_read_status')
                                .insert({
                                  notification_id: notif.id,
                                  read_by: orgShortName
                                });
                            }
                            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                            setUnreadCount(0);
                          }}
                        >
                          Mark all read
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600 hover:text-red-800 h-7 px-2"
                          onClick={async () => {
                            for (const notif of notifications) {
                              await supabase
                                .from('notification_read_status')
                                .delete()
                                .eq('notification_id', notif.id)
                                .eq('read_by', orgShortName);
                            }
                            await supabase
                              .from('notifications')
                              .delete()
                              .in('id', notifications.map(n => n.id));
                            setNotifications([]);
                            setUnreadCount(0);
                          }}
                        >
                          Delete all
                        </Button>
                      </div>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No messages.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 rounded-lg border ${notif.isRead ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-semibold text-sm" style={{ color: "#003b27" }}>
                                {notif.eventTitle}
                              </div>
                              {notif.eventDescription && (
                                <div className="text-xs text-gray-600 mt-1 whitespace-pre-line">
                                  {notif.eventDescription}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                Added by {notif.createdBy} on {new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              {!notif.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-blue-600 hover:text-blue-800 h-6 px-2"
                                  onClick={async () => {
                                    await supabase
                                      .from('notification_read_status')
                                      .insert({
                                        notification_id: notif.id,
                                        read_by: orgShortName
                                      });
                                    setNotifications(prev => 
                                      prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
                                    );
                                    setUnreadCount(prev => Math.max(0, prev - 1));
                                  }}
                                >
                                  Read
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-red-600 hover:text-red-800 h-6 px-2"
                                onClick={async () => {
                                  await supabase
                                    .from('notification_read_status')
                                    .delete()
                                    .eq('notification_id', notif.id)
                                    .eq('read_by', orgShortName);
                                  await supabase
                                    .from('notifications')
                                    .delete()
                                    .eq('id', notif.id);
                                  setNotifications(prev => prev.filter(n => n.id !== notif.id));
                                  if (!notif.isRead) {
                                    setUnreadCount(prev => Math.max(0, prev - 1));
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </PopoverContent>
              </Popover>
              <Button
                onClick={() => setShowProfile(true)}
                variant="ghost"
                size="icon"
                className="rounded-full w-10 h-10"
                style={{ borderColor: "#d4af37", color: "#003b27" }}
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* On Hold Warning in Dashboard */}
          {isOnHold && (
            <div className="mb-6 p-4 rounded-lg border bg-orange-50 border-orange-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-orange-800 mb-1">Account On Hold</p>
                  <p className="text-sm text-orange-700">
                    Your account is currently on hold due to pending requirements. Please complete your pending dues to resume submitting activity requests.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Calendar Card */}
            <Card
              className="flex-1 p-4 lg:p-8 shadow-xl border-t-4"
              style={{ borderTopColor: "#d4af37" }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 lg:mb-6 gap-3">
                <div className="flex items-center gap-2 lg:gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentDate(
                        new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth() - 1,
                          1,
                        ),
                      )
                    }
                    className="hover:bg-gray-200"
                  >
                    <ChevronLeft
                      className="h-5 w-5"
                      style={{ color: "#003b27" }}
                    />
                  </Button>

                  <Popover
                    open={isMonthPickerOpen}
                    onOpenChange={setIsMonthPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="text-xl lg:text-3xl font-bold hover:bg-gray-100"
                        style={{ color: "#003b27" }}
                      >
                        {monthName} {year}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {renderMonthPicker()}
                    </PopoverContent>
                  </Popover>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setCurrentDate(
                        new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth() + 1,
                          1,
                        ),
                      )
                    }
                    className="hover:bg-gray-200"
                  >
                    <ChevronRight
                      className="h-5 w-5"
                      style={{ color: "#003b27" }}
                    />
                  </Button>
                </div>

                <div className="flex gap-2 lg:gap-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      setCurrentDate(
                        new Date(today.getFullYear(), today.getMonth(), 1),
                      );
                      setSelectedDate(today);
                      setActiveView("TODAY");
                    }}
                    className="font-semibold px-3 lg:px-6 transition-all hover:scale-105 hover:shadow-md text-xs lg:text-sm"
                    style={{
                      backgroundColor: "#d4af37",
                      color: "#003b27",
                    }}
                  >
                    TODAY
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveView("EVENT")}
                    className="font-semibold px-3 lg:px-6 transition-all hover:scale-105 hover:shadow-md text-xs lg:text-sm"
                    style={{
                      backgroundColor: "#003b27",
                      color: "#d4af37",
                    }}
                  >
                    EVENT
                  </Button>
                  {showDeadline && (
                    <Button
                      size="sm"
                      onClick={() => setActiveView("DEADLINE")}
                      className="font-semibold px-3 lg:px-6 transition-all hover:scale-105 hover:shadow-md text-xs lg:text-sm"
                      style={{
                        backgroundColor: activeView === "DEADLINE" ? "#dc2626" : "#991b1b",
                        color: "#ffffff",
                      }}
                    >
                      DEADLINE
                    </Button>
                  )}
                  {showAddButton && (
                    <Button
                      size="icon"
                      className="rounded-full w-8 h-8 lg:w-10 lg:h-10 shadow-lg hover:shadow-xl transition-all"
                      style={{ backgroundColor: "#d4af37" }}
                      onClick={openAddEventModal}
                    >
                      <Plus
                        className="h-4 w-4 lg:h-5 lg:w-5"
                        style={{ color: "#003b27" }}
                      />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 lg:gap-2 shadow-inner bg-gray-50 p-2 lg:p-4 rounded-lg overflow-x-auto">
                {renderCalendar()}
              </div>
            </Card>

            {/* Side Panel - TODAY/INBOX */}
            <Card
              className="w-full lg:w-80 p-4 lg:p-6 shadow-xl border-t-4"
              style={{ borderTopColor: "#d4af37" }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: '#d4af37' }}
                >
                  <svg className="w-5 h-5" style={{ color: '#003b27' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </div>
                <div>
                  <h3
                    className="text-lg lg:text-xl font-bold"
                    style={{ color: "#003b27" }}
                  >
                    INBOX
                  </h3>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                    {selectedDate && selectedDate.toDateString() === new Date().toDateString() ? "Today" : "Selected Date"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-4 lg:mb-6 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">
                  {selectedDate
                    ? formatSelectedDate(selectedDate)
                    : "Select a date"}
                </span>
              </div>
              <div className="space-y-4 max-h-[400px] lg:max-h-none overflow-y-auto pr-1">
                {selectedDate && getEventsForDate(selectedDate).length > 0 ? (
                  getEventsForDate(selectedDate).map((event) => {
                    const dayNumber = getEventDayNumber(event, selectedDate);
                    const isCurrentDay = 
                      selectedDate.getDate() === new Date().getDate() &&
                      selectedDate.getMonth() === new Date().getMonth() &&
                      selectedDate.getFullYear() === new Date().getFullYear();
                    
                    // Professional deadline card styling
                    if (event.isDeadline) {
                      return (
                        <div
                          key={event.id}
                          className="rounded-xl overflow-hidden shadow-md border border-red-200 bg-white"
                        >
                          <div className="px-4 py-3 bg-gradient-to-r from-red-600 to-rose-600 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-white font-bold text-sm uppercase tracking-wider">
                                {event.deadlineType === 'accomplishment' ? 'Accomplishment Report Due' : 'Liquidation Report Due'}
                              </span>
                            </div>
                            <span className="text-xs text-red-100 font-medium">
                              Due Today
                            </span>
                          </div>
                          <div className="p-4">
                            <h4 className="font-bold text-gray-800 mb-1">
                              {event.title}
                            </h4>
                            <DeadlineAppealSection 
                              deadlineType={event.deadlineType}
                              eventId={event.parentEventId}
                              orgShortName={orgShortName}
                              targetOrg={event.targetOrganization}
                              appealApproved={event.hasOverride}
                            />
                          </div>
                        </div>
                      );
                    }
                    
                    // Regular event card styling
                    return (
                      <div
                        key={event.id}
                        className="rounded-xl overflow-hidden shadow-md border bg-white hover:shadow-lg transition-all"
                        style={{ borderColor: isCurrentDay ? '#d4af37' : '#e5e7eb' }}
                      >
                        <div 
                          className="px-4 py-3 flex items-center justify-between"
                          style={{ 
                            backgroundColor: isCurrentDay ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 59, 39, 0.05)',
                            borderBottom: '3px solid #003b27'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: '#003b27' }}
                            />
                            <span className="font-bold text-sm" style={{ color: '#003b27' }}>
                              {isCurrentDay ? 'Today' : 'Event'}
                            </span>
                          </div>
                          {canEditEvents && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-white/50"
                                onClick={() => openEditEventModal(event)}
                              >
                                <Edit2 className="h-3.5 w-3.5" style={{ color: "#003b27" }} />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-gray-800 text-base mb-2">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>
                              {event.startDate === event.endDate ? event.startDate : `${event.startDate} — ${event.endDate}`}
                            </span>
                          </div>
                          {!event.allDay && event.startTime && event.endTime && (
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{event.startTime} — {event.endTime}</span>
                            </div>
                          )}
                          {event.description && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-sm text-gray-600 leading-relaxed break-words whitespace-pre-wrap">
                                {event.description}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 lg:py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400 font-medium">No events</p>
                    <p className="text-gray-300 text-sm mt-1">Select a date with events</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
            </>
          )}
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              Confirm Logout
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">
              Are you sure you want to logout?
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsLogoutDialogOpen(false)}
              className="flex-1"
            >
              No
            </Button>
            <Button
              onClick={handleLogout}
              className="flex-1"
              style={{ backgroundColor: "#003b27" }}
            >
              Yes, Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Submission Dialog */}
      <Dialog open={showPendingDialog} onOpenChange={setShowPendingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600">
              Request Already Submitted
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              You already have a pending request. Please wait for it to be reviewed before submitting another activity request.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowPendingDialog(false)}
              style={{ backgroundColor: "#003b27" }}
            >
              Okay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* On Hold Dialog */}
      <Dialog open={isOnHoldDialogOpen} onOpenChange={setIsOnHoldDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600">
              Account On Hold
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Your account is currently on hold due to pending requirements. Please complete your pending dues to resume submitting activity requests.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsOnHoldDialogOpen(false)}
              style={{ backgroundColor: "#003b27" }}
            >
              Okay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Submission Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-green-600">
              Request Submitted Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Your activity request has been submitted successfully. Please wait for it to be reviewed.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              style={{ backgroundColor: "#003b27" }}
            >
              Okay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">
              Delete Activity Log
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700">
              Are you sure you want to delete this activity log? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setLogToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteLog}
              style={{ backgroundColor: "#dc2626" }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              {editingEvent ? "Edit Event" : "Add Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {formError && (
              <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                {formError}
              </div>
            )}
            <div>
              <Label>Title</Label>
              <Input
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event title"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                />
              </div>
            </div>
            {!eventAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="border-t pt-4 space-y-4">
              <div>
                <Label>Organization</Label>
                <select
                  value={eventTargetOrg}
                  onChange={(e) => setEventTargetOrg(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b27] text-base"
                >
                  {organizationsList.map((org) => (
                    <option key={org.key} value={org.key}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="requireAccomplishment" className="cursor-pointer text-sm font-medium">
                    Set Accomplishment Report
                  </Label>
                  <Checkbox
                    id="requireAccomplishment"
                    checked={eventRequireAccomplishment}
                    onCheckedChange={(checked) =>
                      setEventRequireAccomplishment(checked as boolean)
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <Label htmlFor="requireLiquidation" className="cursor-pointer text-sm font-medium">
                    Set Liquidation Report
                  </Label>
                  <Checkbox
                    id="requireLiquidation"
                    checked={eventRequireLiquidation}
                    onCheckedChange={(checked) =>
                      setEventRequireLiquidation(checked as boolean)
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allDay"
                  checked={eventAllDay}
                  onCheckedChange={(checked) => setEventAllDay(checked as boolean)}
                />
                <Label htmlFor="allDay">All Day</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleDeleteEvent(editingEvent.id);
                  setIsEventModalOpen(false);
                }}
                className="flex-1"
              >
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setIsEventModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              className="flex-1"
              style={{ backgroundColor: "#003b27" }}
            >
              {editingEvent ? "Update Event" : "Add Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
