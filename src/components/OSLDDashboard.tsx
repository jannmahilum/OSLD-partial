import { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  ArrowLeft,
  X,
  Edit2,
  Menu,
  Eye,
  EyeOff,
  LogOut,
  Upload,
  Users,
  Clock,
  MapPin,
  DollarSign,
  Target,
  Sparkles,
  Calendar,
  FileText,
  Download,
  AlertTriangle,
  Image as ImageIcon,
  Building2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import AccountsPage from "./AccountsPage";
import SubmissionsPage from "./SubmissionsPage";
import CreateAccountPage from "./CreateAccountPage";
import OrganizationsPage from "./OrganizationsPage";
import { supabase } from "../lib/supabase";
import { useToast } from "./ui/use-toast";

// Deadline Notification Component for OSLD
const OSLDDeadlineNotification = ({ 
  deadlineType, 
  eventId, 
  targetOrg 
}: { 
  deadlineType: 'accomplishment' | 'liquidation', 
  eventId: string,
  targetOrg?: string 
}) => {
  const [isSending, setIsSending] = useState(false);
  const [notified, setNotified] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const { toast } = useToast();

  const reportType = deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation';

  // Organization name mapping
  const orgNameMap: { [key: string]: string } = {
    "AO": "Accredited Organizations",
    "LSG": "Local Student Government",
    "GSC": "Graduating Student Council",
    "LCO": "League of Campus Organization",
    "USG": "University Student Government",
    "TGP": "The Gold Panicles",
    "ALL": "All Organizations"
  };

  // Check if an appeal was submitted by the target organization for this specific event
  useEffect(() => {
    const checkAppealStatus = async () => {
      if (!targetOrg) return;
      
      const { data } = await supabase
        .from('submissions')
        .select('id, organization')
        .eq('submission_type', 'Letter of Appeal')
        .ilike('activity_title', `%${reportType}%`)
        .eq('submitted_to', 'OSLD')
        .eq('event_id', eventId)
        .limit(1);
      
      setAppealSubmitted(!!data && data.length > 0);
    };
    checkAppealStatus();
  }, [eventId, targetOrg, reportType]);

  const handleNotifyOrg = async () => {
    setIsSending(true);
    try {
      // Create notification in database
      const { error } = await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          event_title: `${reportType} Report Deadline`,
          event_description: `Today is the deadline for the submission of ${reportType} report`,
          created_by: 'OSLD',
          target_org: targetOrg || 'ALL'
        });

      if (error) throw error;

      setNotified(true);
      toast({
        title: "Notification Sent",
        description: `Notification sent to ${orgNameMap[targetOrg || 'ALL'] || targetOrg || 'all organizations'} successfully!`,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // If appeal was submitted, show orange background with appeal notification
  if (appealSubmitted) {
    // Different message based on which organization submitted the appeal
    const appealMessage = targetOrg === 'AO' || targetOrg === 'LSG'
      ? 'An organization has submitted a Letter of Appeal. Please wait for further announcement. Thank you.'
      : 'An organization has submitted a Letter of Appeal. Please check and review it in the Submissions page.';
    
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
          {targetOrg && targetOrg !== 'ALL' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Organization:</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">
                {orgNameMap[targetOrg] || targetOrg}
              </span>
            </div>
          )}
          <p className="text-xs text-amber-700 mt-2 leading-relaxed">
            {appealMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 bg-gradient-to-br from-red-50 via-rose-50 to-red-100 border border-red-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-semibold uppercase tracking-wider text-red-600">Deadline Today</span>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          <span className="font-bold" style={{ color: "#003b27" }}>{reportType} Report Due</span>
        </p>
        <p className="text-xs text-gray-600 leading-relaxed">
          Today is the deadline for the submission of {reportType} report
        </p>
        {targetOrg && targetOrg !== 'ALL' && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">Organization:</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              {orgNameMap[targetOrg] || targetOrg}
            </span>
          </div>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-red-200">
        {notified ? (
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
            onClick={handleNotifyOrg}
            disabled={isSending}
            className="w-full text-xs font-semibold rounded-lg border-2 hover:shadow-md transition-all"
            style={{ borderColor: "#003b27", color: "#003b27" }}
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Sending...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notify Organization
              </span>
            )}
          </Button>
        )}
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
  color?: string;
  targetOrganization?: string;
  requireAccomplishment?: boolean;
  requireLiquidation?: boolean;
  isDeadline?: boolean;
  deadlineType?: 'accomplishment' | 'liquidation';
  parentEventId?: string;
  accomplishmentDeadlineOverride?: string;
  liquidationDeadlineOverride?: string;
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

interface Adviser {
  id: string;
  name: string;
  position: string;
  image?: string;
}

interface OrgAccount {
  email: string;
  role: string;
  status: "Active" | "Inactive";
}

export default function OSLDDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [activeView, setActiveView] = useState<"TODAY" | "EVENT">("TODAY");
  const [showProfile, setShowProfile] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notifications, setNotifications] = useState<Array<{ id: string; eventTitle: string; eventDescription: string; createdBy: string; createdAt: string; isRead: boolean }>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedTemplateOrg, setSelectedTemplateOrg] = useState<string | null>(null);
  const [templateFiles, setTemplateFiles] = useState<Record<string, { fiscal?: File[] }>>({});
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  const [uploadedTemplates, setUploadedTemplates] = useState<Record<string, { fiscal?: { fileName: string; fileUrl: string }[] }>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [templateLinks, setTemplateLinks] = useState<Record<string, { fiscal?: string }>>({});


  // Event form state
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventAllDay, setEventAllDay] = useState(false);
  const [eventRecurrence, setEventRecurrence] = useState("");
  const [eventTargetOrg, setEventTargetOrg] = useState("");
  const [eventRequireAccomplishment, setEventRequireAccomplishment] = useState(false);
  const [eventRequireLiquidation, setEventRequireLiquidation] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

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

  // Profile state
  const [accreditationStatus, setAccreditationStatus] =
    useState("Not Accredited");
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [advisers, setAdvisers] = useState<Adviser[]>([]);
  const [resolutionFiles, setResolutionFiles] = useState<File[]>([]);
  const [actionPlanFiles, setActionPlanFiles] = useState<File[]>([]);
  const [platforms, setPlatforms] = useState({ facebook: "", other: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [officerImage, setOfficerImage] = useState<string>("");
  const [adviserImage, setAdviserImage] = useState<string>("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");

  // Load user data from auth
  useEffect(() => {
    const loadUserData = async () => {
      // Load from localStorage first (set during login) - use OSLD-specific keys
      const storedEmail = localStorage.getItem("osld_userEmail");
      const storedPassword = localStorage.getItem("osld_userPassword");
      
      if (storedEmail) {
        setCurrentEmail(storedEmail);
      } else {
        setCurrentEmail("OSLD@carsu.edu.ph");
      }
      if (storedPassword) {
        setCurrentPassword(storedPassword);
      } else {
        setCurrentPassword("OSLDsite");
      }
      
      // Fallback to Supabase auth if no localStorage data
      if (!storedEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentEmail(user.email || "OSLD@carsu.edu.ph");
        }
      }
    };
    loadUserData();
  }, []);

  // Load activity logs from database - OSLD's own submissions and submissions submitted to OSLD
  useEffect(() => {
    const loadActivityLogs = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .or('organization.eq.OSLD,submitted_to.eq.OSLD')
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
  }, []);

  // Add/Edit modal state
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [isAdviserModalOpen, setIsAdviserModalOpen] = useState(false);
  const [isSocialContactModalOpen, setIsSocialContactModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [editingAdviser, setEditingAdviser] = useState<Adviser | null>(null);
  const [officerName, setOfficerName] = useState("");
  const [officerRole, setOfficerRole] = useState("");
  const [officerProgram, setOfficerProgram] = useState("");
  const [officerIdNumber, setOfficerIdNumber] = useState("");
  const [adviserName, setAdviserName] = useState("");
  const [adviserYearsExperience, setAdviserYearsExperience] = useState("");
  const [adviserExpertise, setAdviserExpertise] = useState<string[]>([]);
  const [editFacebookLink, setEditFacebookLink] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [templateStatusMessage, setTemplateStatusMessage] = useState<{[key: string]: {accomplishment?: string, liquidation?: string}}>({});
  const [selectedOrganization, setSelectedOrganization] = useState(
    "Office of Student Leadership and Development",
  );
  const [orgAccounts, setOrgAccounts] = useState<Record<string, OrgAccount[]>>(
    {},
  );
  const [isEditAccountModalOpen, setIsEditAccountModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sentVerificationCode, setSentVerificationCode] = useState("");
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedActivityLog, setSelectedActivityLog] = useState<any | null>(null);
  const [isActivityLogDetailOpen, setIsActivityLogDetailOpen] = useState(false);
  const [orgLogo, setOrgLogo] = useState<string>("");

  // Event color palette
  const eventColors = [
    "#003b27", // Dark green
    "#d4af37", // Gold
    "#2d5f3f", // Medium green
    "#b8941f", // Dark gold
    "#4a7c59", // Light green
    "#8b7355", // Brown
    "#5a6c57", // Sage
    "#3d5a4c", // Forest
  ];

  const getEventColor = (eventId: string) => {
    // Use event ID to consistently assign a color
    const index = parseInt(eventId) % eventColors.length;
    return eventColors[index];
  };

  const organizations = [
    "Office of Student Leadership and Development",
    "Accredited Organizations",
    "Local Student Government",
    "Graduating Student Council",
    "University Student Entreprenuership Development Unit",
    "Commision on Audit",
    "University Student Government",
    "League of Campus Organization",
    "The Gold Panicles",
  ];

  // Load from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      console.log("Loading data from Supabase...");
      
      // Load profile - ALWAYS get or create THE FIRST ROW
      const { data: profileData, error } = await supabase
        .from('osld_profile')
        .select('*')
        .order('id')
        .limit(1)
        .maybeSingle();
      
      console.log("Profile data:", profileData, "Error:", error);
      
      if (profileData) {
        console.log("Setting profile data:", profileData);
        setAccreditationStatus(profileData.accreditation_status || "Not Accredited");
        setOfficers(profileData.officers || []);
        setAdvisers(profileData.advisers || []);
        setPlatforms(profileData.platforms || { facebook: "", other: "" });
        setContactEmail(profileData.contact_email || "");
        setContactPhone(profileData.contact_phone || "");
      } else {
        // No rows exist, create THE FIRST AND ONLY row
        console.log("Creating initial profile row...");
        const { data: newProfile, error: insertError } = await supabase
          .from('osld_profile')
          .insert({
            accreditation_status: "Not Accredited",
            officers: [],
            advisers: [],
            platforms: { facebook: "", other: "" },
            contact_email: "",
            contact_phone: ""
          })
          .select()
          .single();
        
        console.log("Created profile:", newProfile, "Error:", insertError);
      }

      // Load events
      const { data: eventsData } = await supabase
        .from('osld_events')
        .select('*');
      
      console.log("Events data:", eventsData);
      
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
            requireLiquidation: e.require_liquidation,
            accomplishmentDeadlineOverride: e.accomplishment_deadline_override,
            liquidationDeadlineOverride: e.liquidation_deadline_override
          });
          
          // OSLD does NOT have deadline events in their list - they just see red bg/dot in calendar for dates with deadlines
        });
        
        setEvents(formattedEvents);
      }

      // Load notifications - only notifications targeted to OSLD or ALL
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .or('target_org.eq.OSLD,target_org.eq.ALL')
        .order('created_at', { ascending: false });
      
      // Load read status for OSLD
      const { data: readStatusData } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('read_by', 'OSLD');
      
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

      // Load org accounts from localStorage (keep this for now)
      const savedOrgAccounts = localStorage.getItem("orgAccounts");
      if (savedOrgAccounts) {
        setOrgAccounts(JSON.parse(savedOrgAccounts));
      }

      // Mark data as loaded - NOW we can start auto-saving
      setIsDataLoaded(true);
    };

    loadData();
  }, []);

  // Save profile to Supabase IMMEDIATELY when data changes
  const saveProfileToSupabase = async (profileData: any) => {
    console.log("💾 Saving profile immediately...", profileData);
    
    // ALWAYS get THE FIRST profile row
    const { data: existingProfile } = await supabase
      .from('osld_profile')
      .select('id')
      .order('id')
      .limit(1)
      .maybeSingle();

    if (existingProfile) {
      // Update THE FIRST profile row
      const { error } = await supabase
        .from('osld_profile')
        .update(profileData)
        .eq('id', existingProfile.id);
      
      console.log("Update result - Error:", error);
      if (!error) {
        console.log("✅ Profile saved successfully!");
      }
    } else {
      // Create THE FIRST profile row
      const { error } = await supabase
        .from('osld_profile')
        .insert(profileData);
      
      console.log("Insert result - Error:", error);
      if (!error) {
        console.log("✅ Profile created successfully!");
      }
    }
  };

  // Watch for changes and save immediately - BUT ONLY AFTER INITIAL LOAD
  useEffect(() => {
    // Don't save until data is loaded from Supabase
    if (!isDataLoaded) {
      console.log("⏳ Skipping save - data not loaded yet");
      return;
    }

    const profileData = {
      accreditation_status: accreditationStatus,
      officers,
      advisers,
      platforms,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      updated_at: new Date().toISOString()
    };

    // Save immediately without debounce
    saveProfileToSupabase(profileData);
  }, [accreditationStatus, officers, advisers, platforms, contactEmail, contactPhone, isDataLoaded]);

  // Auto-save org accounts
  useEffect(() => {
    console.log("Saving org accounts:", orgAccounts);
    localStorage.setItem("orgAccounts", JSON.stringify(orgAccounts));
  }, [orgAccounts]);

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
        const templatesMap: Record<string, { fiscal?: { fileName: string; fileUrl: string }[] }> = {};
        data.forEach((template: { organization: string; template_type: string; file_name: string; file_url: string }) => {
          if (!templatesMap[template.organization]) {
            templatesMap[template.organization] = { fiscal: [] };
          }
          if (template.template_type === "fiscal") {
            if (!templatesMap[template.organization].fiscal) {
              templatesMap[template.organization].fiscal = [];
            }
            templatesMap[template.organization].fiscal!.push({
              fileName: template.file_name,
              fileUrl: template.file_url
            });
          }
        });
        setUploadedTemplates(templatesMap);
      }
    };
    loadTemplates();
  }, []);

  const uploadTemplate = async (org: string, type: "fiscal", files: File[]) => {
    setIsUploading(true);
    try {
      const uploadedFiles: { fileName: string; fileUrl: string }[] = [];
      
      for (const file of files) {
        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${org}_${type}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `templates/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("form-templates")
          .upload(filePath, file);

        if (uploadError) {
          // If bucket doesn't exist, we'll store just the file name
          console.error("Storage upload error:", uploadError);
        }

        // Get public URL or use placeholder
        const { data: urlData } = supabase.storage
          .from("form-templates")
          .getPublicUrl(filePath);

        const fileUrl = urlData?.publicUrl || filePath;

        // Save to database (insert, not upsert to allow multiple files)
        const { error: dbError } = await supabase
          .from("form_templates")
          .insert({
            organization: org,
            template_type: type,
            file_name: file.name,
            file_url: fileUrl,
            uploaded_at: new Date().toISOString()
          });

        if (dbError) {
          console.error("Database error:", dbError);
          showNotif(`Error saving template: ${dbError.message}`);
          continue;
        }

        uploadedFiles.push({ fileName: file.name, fileUrl });
      }

      // Update local state - append to existing templates
      setUploadedTemplates(prev => ({
        ...prev,
        [org]: {
          ...prev[org],
          [type]: [...(prev[org]?.[type] || []), ...uploadedFiles]
        }
      }));

      // Clear the file from templateFiles
      setTemplateFiles(prev => ({
        ...prev,
        [org]: {
          ...prev[org],
          [type]: undefined
        }
      }));

      setTemplateStatusMessage(prev => ({
        ...prev,
        [org]: {
          ...prev[org],
          [type]: `${uploadedFiles.length} template(s) saved successfully`
        }
      }));
      setTimeout(() => {
        setTemplateStatusMessage(prev => ({
          ...prev,
          [org]: {
            ...prev[org],
            [type]: undefined
          }
        }));
      }, 3000);
    } catch (error) {
      console.error("Upload error:", error);
      showNotif("Error uploading template");
    } finally {
      setIsUploading(false);
    }
  };

  const showNotif = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

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

  const hasEventOnDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.some((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      
      // Check if the event falls on this date
      if (current >= start && current <= end) {
        return true;
      }
      
      // Check for recurring events
      if (event.recurrenceType && event.recurrenceType !== 'None' && event.recurrenceType !== '') {
        return isRecurringEventOnDate(event, current);
      }
      
      return false;
    });
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    let filteredEvents = events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
    
    // Add deadline events for the selected date
    events.forEach((event) => {
      if (!event.endDate) return;
      
      // Check accomplishment deadline (3 working days after event end or override date)
      if (event.requireAccomplishment) {
        const accomDeadlineDate = event.accomplishmentDeadlineOverride || calculateDeadlineDate(event.endDate, 3);
        if (dateStr === accomDeadlineDate) {
          filteredEvents.push({
            ...event,
            id: `${event.id}-accom-deadline`,
            title: event.title,
            isDeadline: true,
            deadlineType: 'accomplishment',
            parentEventId: event.id,
            targetOrganization: event.targetOrganization
          });
        }
      }
      
      // Check liquidation deadline (7 working days after event end or override date)
      if (event.requireLiquidation) {
        const liqDeadlineDate = event.liquidationDeadlineOverride || calculateDeadlineDate(event.endDate, 7);
        if (dateStr === liqDeadlineDate) {
          filteredEvents.push({
            ...event,
            id: `${event.id}-liq-deadline`,
            title: event.title,
            isDeadline: true,
            deadlineType: 'liquidation',
            parentEventId: event.id,
            targetOrganization: event.targetOrganization
          });
        }
      }
    });
    
    return filteredEvents;
  };

  const getEventsCountForDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    let count = 0;
    
    events.forEach((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      
      // Original event dates
      if (current >= start && current <= end) {
        count++;
      } else if (event.recurrenceType && event.recurrenceType !== 'None' && event.recurrenceType !== '') {
        // Check for recurring events
        if (isRecurringEventOnDate(event, current)) {
          count++;
        }
      }
    });
    
    return count;
  };

  const getEventDotsForDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const filteredEvents = [];
    
    events.forEach((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      
      // Original event dates
      if (current >= start && current <= end) {
        filteredEvents.push(event);
      } else if (event.recurrenceType && event.recurrenceType !== 'None' && event.recurrenceType !== '') {
        // Check for recurring events
        if (isRecurringEventOnDate(event, current)) {
          filteredEvents.push(event);
        }
      }
    });
    
    return filteredEvents;
  };

  const hasDeadlineOnDate = (day: number) => {
    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const checkDate = new Date(dateStr);
    
    // Check if any event has a deadline (accomplishment or liquidation) on this date
    return events.some((event) => {
      if (!event.endDate) return false;
      
      // Check accomplishment deadline (3 working days after event end or override date)
      if (event.requireAccomplishment) {
        const accomDeadlineDate = event.accomplishmentDeadlineOverride || calculateDeadlineDate(event.endDate, 3);
        if (dateStr === accomDeadlineDate) return true;
      }
      
      // Check liquidation deadline (7 working days after event end or override date)
      if (event.requireLiquidation) {
        const liqDeadlineDate = event.liquidationDeadlineOverride || calculateDeadlineDate(event.endDate, 7);
        if (dateStr === liqDeadlineDate) return true;
      }
      
      return false;
    });
  };

  const getEventDayNumber = (event: Event, currentDate: Date) => {
    const start = new Date(event.startDate);
    const current = new Date(currentDate);
    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
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
    setEventRecurrence("");
    setEventTargetOrg("ALL");
    setEventRequireAccomplishment(false);
    setEventRequireLiquidation(false);
    setFormError("");
    setIsEventModalOpen(true);
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

  const handleSaveEvent = async () => {
    setFormError("");

    if (!eventTitle.trim()) {
      setFormError("Title is required");
      return;
    }
    if (!eventStartDate) {
      setFormError("Start date is required");
      return;
    }
    if (!eventEndDate) {
      setFormError("End date is required");
      return;
    }
    if (new Date(eventEndDate) < new Date(eventStartDate)) {
      setFormError("End date cannot be before start date");
      return;
    }

    if (editingEvent) {
      // Update existing event
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
      // Create new event
      const newEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        description: eventDescription,
        start_date: eventStartDate,
        end_date: eventEndDate,
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

      // Create notification for new event (notify all orgs except OSLD)
      const allOrgs = ['AO', 'LSG', 'GSC', 'LCO', 'USG', 'TGP', 'COA'];
      const notificationPromises = allOrgs.map(org => 
        supabase
          .from('notifications')
          .insert({
            event_id: newEvent.id,
            event_title: newEvent.title,
            event_description: newEvent.description,
            created_by: 'OSLD',
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
        if (liqDeadline) deadlineInfo += `${accomDeadline ? '\n' : ''}Liquidation Report due: ${liqDeadline}`;
        
        // Organization name mapping
        const orgNameMap: { [key: string]: string } = {
          "AO": "Accredited Organizations",
          "LSG": "Local Student Government",
          "GSC": "Graduating Student Council",
          "LCO": "Local Council of Organizations",
          "USG": "University Student Government",
          "TGP": "The Guidon Publications",
          "COA": "Commission on Audit",
          "OSLD": "Office of Student Leadership Development"
        };
        
        // Determine who should receive the notification
        const notificationTargets = [eventTargetOrg];
        
        // Add LCO if event is for AO, add USG if event is for LSG
        if (eventTargetOrg === 'AO') {
          notificationTargets.push('LCO');
        } else if (eventTargetOrg === 'LSG') {
          notificationTargets.push('USG');
        }
        
        // Send notification to all targets
        for (const org of notificationTargets) {
          const description = org === eventTargetOrg 
            ? `OSLD requires submission of ${reportTypes.join(' and ')} report for "${newEvent.title}".\n${deadlineInfo}`
            : `OSLD requires submission of ${reportTypes.join(' and ')} report for "${newEvent.title}".\nOrganization: ${orgNameMap[eventTargetOrg] || eventTargetOrg}\n${deadlineInfo}`;
          
          await supabase
            .from('notifications')
            .insert({
              event_id: newEvent.id,
              event_title: `${reportTypes.join(' & ')} Report Required: ${newEvent.title}`,
              event_description: description,
              created_by: 'OSLD',
              target_org: org
            });
        }
      }

      // Build new events array including deadline events
      const newEventsToAdd: Event[] = [{
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
      }];

      setEvents([...events, ...newEventsToAdd]);

      // Reload notifications - only notifications targeted to OSLD or ALL
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .or('target_org.eq.OSLD,target_org.eq.ALL')
        .order('created_at', { ascending: false });
      
      // Load read status for OSLD
      const { data: readStatusData } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('read_by', 'OSLD');
      
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
    setEventRecurrence("");
    setEventTargetOrg("ALL");
    setEventRequireAccomplishment(false);
    setEventRequireLiquidation(false);
    setEditingEvent(null);
  };

  const confirmDeleteEvent = (eventId: string) => {
    setDeleteEventId(eventId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteEvent = async () => {
    if (deleteEventId) {
      await supabase
        .from('osld_events')
        .delete()
        .eq('id', deleteEventId);

      // Remove the event and any associated deadline events
      const updatedEvents = events.filter((e) => e.id !== deleteEventId && e.parentEventId !== deleteEventId);
      setEvents(updatedEvents);
      setIsDeleteDialogOpen(false);
      setDeleteEventId(null);
      showNotif("Event deleted successfully");
    }
  };

  const handleMonthChange = (monthIndex: number, yearValue: number) => {
    setCurrentDate(new Date(yearValue, monthIndex, 1));
    setIsMonthPickerOpen(false);
  };

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
    if (!officerName.trim() || !officerRole.trim()) {
      showNotif("Please fill in both name and role");
      return;
    }

    // Store role, program, id_number in position field as "Role | Program | ID"
    const position = [officerRole, officerProgram, officerIdNumber].filter(Boolean).join(" | ");

    try {
      if (editingOfficer) {
        // Update existing officer
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

        setOfficers(
          officers.map((o) =>
            o.id === editingOfficer.id
              ? {
                  ...o,
                  name: officerName,
                  position: position,
                  image: officerImage || o.image,
                }
              : o,
          ),
        );
        showNotif("Officer updated successfully");
      } else {
        // Add new officer
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: "osld",
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
        showNotif("Officer added successfully");
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
      showNotif("Failed to save officer");
    }
  };

  const removeOfficer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setOfficers(officers.filter((o) => o.id !== id));
      showNotif("Officer removed successfully");
    } catch (error) {
      console.error("Error removing officer:", error);
      showNotif("Failed to remove officer");
    }
  };

  const openAddAdviserModal = () => {
    setEditingAdviser(null);
    setAdviserName("");
    setAdviserYearsExperience("");
    setAdviserExpertise([]);
    setAdviserImage("");
    setIsAdviserModalOpen(true);
  };

  const openEditAdviserModal = (adviser: Adviser) => {
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
    if (!adviserName.trim()) {
      showNotif("Please fill in the name");
      return;
    }

    // Store years and expertise in position field as "Years | Expertise1, Expertise2 Adviser"
    const expertiseStr = adviserExpertise.filter(Boolean).join(", ");
    const positionParts = [adviserYearsExperience, expertiseStr].filter(Boolean).join(" | ");
    const finalPosition = positionParts ? `${positionParts} Adviser` : "Adviser";

    try {
      if (editingAdviser) {
        // Update existing adviser
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

        setAdvisers(
          advisers.map((a) =>
            a.id === editingAdviser.id
              ? {
                  ...a,
                  name: adviserName,
                  position: finalPosition,
                  image: adviserImage || a.image,
                }
              : a,
          ),
        );
        showNotif("Adviser updated successfully");
      } else {
        // Add new adviser
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: "osld",
            name: adviserName,
            position: finalPosition,
            image: adviserImage || null,
          })
          .select()
          .single();

        if (error) throw error;

        const newAdviser: Adviser = {
          id: data.id,
          name: adviserName,
          position: finalPosition,
          image: adviserImage,
        };
        setAdvisers([...advisers, newAdviser]);
        showNotif("Adviser added successfully");
      }

      setIsAdviserModalOpen(false);
      setAdviserName("");
      setAdviserYearsExperience("");
      setAdviserExpertise([]);
      setAdviserImage("");
      setEditingAdviser(null);
    } catch (error) {
      console.error("Error saving adviser:", error);
      showNotif("Failed to save adviser");
    }
  };

  const removeAdviser = async (id: string) => {
    try {
      const { error } = await supabase
        .from("org_officers")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAdvisers(advisers.filter((a) => a.id !== id));
      showNotif("Adviser removed successfully");
    } catch (error) {
      console.error("Error removing adviser:", error);
      showNotif("Failed to remove adviser");
    }
  };

  const handleSaveProfile = () => {
    const profileData = {
      accreditationStatus,
      officers,
      advisers,
      platforms,
      contactEmail,
      contactPhone,
    };
    localStorage.setItem("osld_profile", JSON.stringify(profileData));
    showNotif("Profile saved successfully!");
  };

  // Load officers, advisers, and social contacts from database on mount
  useEffect(() => {
    const loadOfficersAndAdvisers = async () => {
      try {
        const { data, error } = await supabase
          .from("org_officers")
          .select("*")
          .eq("organization", "osld");

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
          .eq("organization", "osld")
          .maybeSingle();

        if (data) {
          setPlatforms({ facebook: data.facebook_url || "", other: "" });
          setContactEmail(data.contact_email || "");
          setContactPhone(data.contact_phone || "");
        }
      } catch (error) {
        console.error("Error loading social contacts:", error);
      }
    };

    const loadOrgLogo = async () => {
      try {
        const { data: files } = await supabase.storage
          .from('osld-files')
          .list('logos', {
            search: 'Office_of_Student_Leadership_and_Development_logo'
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

    loadOfficersAndAdvisers();
    loadSocialContacts();
    loadOrgLogo();
  }, []);

  const handleSendVerification = () => {
    if (!newEmail || !newEmail.includes("@")) {
      showNotif("Please enter a valid email address");
      return;
    }

    // Generate a random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentVerificationCode(code);
    setIsVerificationSent(true);

    // In a real app, this would send an email
    showNotif(`Verification code sent to ${newEmail}: ${code}`);
  };

  const handleUpdateAccount = () => {
    if (!verificationCode) {
      showNotif("Please enter the verification code");
      return;
    }

    if (verificationCode !== sentVerificationCode) {
      showNotif("Invalid verification code");
      return;
    }

    if (newEmail) {
      setCurrentEmail(newEmail);
      localStorage.setItem("osld_admin_email", newEmail);
    }

    if (newPassword) {
      setCurrentPassword(newPassword);
      localStorage.setItem("osld_admin_password", newPassword);
    }

    showNotif("Account updated successfully!");
    setIsEditAccountModalOpen(false);
    setNewEmail("");
    setNewPassword("");
    setVerificationCode("");
    setSentVerificationCode("");
    setIsVerificationSent(false);
  };

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
          organization: "osld",
          facebook_url: editFacebookLink || null,
          contact_email: editContactEmail || null,
          contact_phone: editContactPhone || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'organization' });

      if (error) throw error;

      setPlatforms({ facebook: editFacebookLink, other: "" });
      setContactEmail(editContactEmail);
      setContactPhone(editContactPhone);
      setIsSocialContactModalOpen(false);
      showNotif("Social contacts updated successfully");
    } catch (error) {
      console.error("Error saving social contacts:", error);
      showNotif("Failed to update social contacts");
    }
  };

  const getAccountsForOrg = (orgName: string): OrgAccount[] => {
    if (orgName === "Office of Student Leadership and Development") {
      const builtInAdmin: OrgAccount = {
        email: "OSLD@carsu.edu.ph",
        role: "Administrator",
        status: "Active",
      };
      const userAccounts = orgAccounts[orgName] || [];
      return [builtInAdmin, ...userAccounts];
    }
    return orgAccounts[orgName] || [];
  };

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
      const hasEvent = hasEventOnDate(day);
      const hasDeadline = hasDeadlineOnDate(day);
      const eventCount = getEventsCountForDate(day);
      const dayEvents = getEventDotsForDate(day);
      const dayDate = new Date(year, currentDate.getMonth(), day);

      // Background logic based on active view
      let bgStyle = {};
      
      if (activeView === "TODAY") {
        // TODAY view: yellow for today, red for deadlines
        if (isToday) {
          bgStyle = { backgroundColor: "rgba(212, 175, 55, 0.2)" };
        } else if (hasDeadline) {
          bgStyle = { backgroundColor: "rgba(239, 68, 68, 0.15)" };
        }
      } else {
        // EVENT view: green for event dates, yellow for today, light red for deadlines
        if (isToday) {
          bgStyle = { backgroundColor: "rgba(212, 175, 55, 0.2)" };
        } else if (hasDeadline) {
          bgStyle = { backgroundColor: "rgba(239, 68, 68, 0.15)" };
        } else if (hasEvent) {
          bgStyle = { backgroundColor: "rgba(0, 59, 39, 0.1)" };
        }
      }

      // Filter events to display based on activeView
      const displayEvents = dayEvents;

      // Determine hover class based on view and event status
      const hoverClass = activeView === "EVENT" && hasEvent && !isToday
        ? "hover:bg-[rgba(0,59,39,0.2)]"
        : "hover:bg-gray-100";

      days.push(
        <div
          key={day}
          onClick={() => {
            setSelectedDate(dayDate);
            setActiveView("TODAY");
          }}
          style={bgStyle}
          className={`p-2 cursor-pointer rounded-lg min-h-[80px] border ${!isToday && !hasEvent ? 'bg-white' : ''} ${hoverClass} relative transition-colors`}
        >
          <div className="text-lg font-semibold text-left">{day}</div>
          {(displayEvents.length > 0 || hasDeadline) && (
            <div className="absolute top-2 right-2 flex gap-1">
              {displayEvents.slice(0, 3).map((event, idx) => (
                <div
                  key={idx}
                  className="w-2 h-2 rounded-full"
                  style={{ 
                    backgroundColor: "#003b27" 
                  }}
                ></div>
              ))}
              {hasDeadline && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: '#ef4444' }}
                ></div>
              )}
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

  const formatSelectedDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleLogout = () => {
    // Clear any session data if needed
    window.location.href = "/";
  };

  // Render Activity Logs Section
  if (activeNav === "Activity Logs") {
    const getStatusColor = (status: string) => {
      switch (status) {
        case "Submitted":
          return "bg-blue-100 text-blue-800";
        case "Pending":
          return "bg-yellow-100 text-yellow-800";
        case "For Revision":
          return "bg-red-100 text-red-800";
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
                  OSLD
                </h1>
                <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-4 py-6">
            {[
              "Dashboard",
              "Accounts",
              "Submissions",
              "Form Templates",
              "Create Account",
              "Activity Logs",
              "Officers",
              "Organizations",
            ].map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item
                    ? { backgroundColor: "#d4af37" }
                    : undefined
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
              Activity Logs
            </h2>
            
            {/* Activity Logs Table */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: "#003b27" }}>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Document Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Organization</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">
                          No activity logs yet. Submissions will appear here once they are made.
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900">{log.documentName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{log.type}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {{
                              "OSLD": "Office of Student Leadership and Development",
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
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{log.date}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="text-xs bg-[#003b27] text-white hover:bg-[#002a1c]"
                                onClick={() => {
                                  setSelectedActivityLog(log);
                                  setIsActivityLogDetailOpen(true);
                                }}
                              >
                                View
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
          </div>
        </div>

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

        {/* Activity Log Detail Dialog */}
        <Dialog open={isActivityLogDetailOpen} onOpenChange={setIsActivityLogDetailOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold" style={{ color: "#003b27" }}>
                Submission Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedActivityLog && (
              <div className="space-y-6 py-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedActivityLog.status === "Approved" ? "bg-green-100 text-green-800" :
                    selectedActivityLog.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                    selectedActivityLog.status === "For Revision" ? "bg-orange-100 text-orange-800" :
                    "bg-blue-100 text-blue-800"
                  }`}>
                    {selectedActivityLog.status}
                  </span>
                </div>

                {/* Revision Reason - Show when status is For Revision */}
                {selectedActivityLog.status === 'For Revision' && selectedActivityLog.revisionReason && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-600 mb-2">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-semibold">Revision Required</span>
                    </div>
                    <p className="text-gray-700 mb-3">
                      You are advised to revise your request to conduct activity due to the following reasons:
                    </p>
                    <div className="p-3 bg-white border border-orange-100 rounded-lg">
                      <p className="text-gray-800">{selectedActivityLog.revisionReason}</p>
                    </div>
                    <p className="text-sm text-gray-600 italic mt-3">
                      Please stay updated for further announcements.
                    </p>
                  </div>
                )}

                {/* Activity Title */}
                <div className="p-4 bg-[#003b27]/5 rounded-lg">
                  <h3 className="text-xl font-bold text-[#003b27]">
                    {selectedActivityLog.documentName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Submitted by {{
                      "OSLD": "Office of Student Leadership and Development",
                      "AO": "Accredited Organizations",
                      "LSG": "Local Student Government",
                      "GSC": "Graduating Student Council",
                      "LCO": "League of Campus Organization",
                      "USG": "University Student Government",
                      "TGP": "The Gold Panicles",
                      "USED": "University Student Enterprise Development"
                    }[selectedActivityLog.organization as string] || selectedActivityLog.organization}
                  </p>
                </div>

                {/* Details Grid - Only show for Request to Conduct Activity */}
                {selectedActivityLog.type !== 'Accomplishment Report' && selectedActivityLog.type !== 'Liquidation Report' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">Duration</span>
                      </div>
                      <p className="text-gray-800 font-semibold">{selectedActivityLog.activity_duration || "N/A"}</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <MapPin className="h-4 w-4" />
                        <span className="text-sm font-medium">Venue/Platform</span>
                      </div>
                      <p className="text-gray-800 font-semibold">{selectedActivityLog.activity_venue || "N/A"}</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Users className="h-4 w-4" />
                        <span className="text-sm font-medium">Target Participants</span>
                      </div>
                      <p className="text-gray-800 font-semibold">{selectedActivityLog.activity_participants || "N/A"}</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <span className="text-lg font-bold">₱</span>
                        <span className="text-sm font-medium">Source of Funds</span>
                      </div>
                      <p className="text-gray-800 font-semibold">₱{selectedActivityLog.activity_funds || "N/A"}</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <span className="text-lg font-bold">₱</span>
                        <span className="text-sm font-medium">Budgetary Requirements</span>
                      </div>
                      <p className="text-gray-800 font-semibold">₱{selectedActivityLog.activity_budget || "N/A"}</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Target className="h-4 w-4" />
                        <span className="text-sm font-medium">SDG</span>
                      </div>
                      <p className="text-gray-800 font-semibold">{selectedActivityLog.activity_sdg || "N/A"}</p>
                    </div>

                    <div className="p-4 border rounded-lg md:col-span-2">
                      <div className="flex items-center gap-2 text-gray-500 mb-1">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-sm font-medium">LIKHA Agenda</span>
                      </div>
                      <p className="text-gray-800 font-semibold">{selectedActivityLog.activity_likha || "N/A"}</p>
                    </div>
                  </div>
                )}

                {/* Submission Info */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm font-medium">Submitted On</span>
                  </div>
                  <p className="text-gray-800">{selectedActivityLog.date}</p>
                </div>

                {/* File Attachment */}
                {selectedActivityLog.fileUrl && (
                  <div className="p-4 border-2 border-dashed rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#003b27]/10 rounded-lg">
                          <FileText className="h-5 w-5 text-[#003b27]" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {selectedActivityLog.submissionType === 'Letter of Appeal' ? 'File for Appeal' : 
                             selectedActivityLog.submissionType === 'Accomplishment Report' ? 'Accomplishment Report File' :
                             selectedActivityLog.submissionType === 'Liquidation Report' ? 'Liquidation Report File' :
                             'Google Drive Folder Link'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {selectedActivityLog.submissionType === 'Request to Conduct Activity' ? 'Contains: Activity Design, Budgetary Requirements, etc.' : 'View submitted file'}
                          </p>
                        </div>
                      </div>
                      <a
                        href={selectedActivityLog.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button 
                          size="sm"
                          style={{ backgroundColor: "#003b27" }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Open Link
                        </Button>
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setIsActivityLogDetailOpen(false)}
              >
                Close
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
                  OSLD
                </h1>
                <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {[
              "Dashboard",
              "Accounts",
              "Submissions",
              "Form Templates",
              "Create Account",
              "Activity Logs",
              "Officers",
              "Organizations",
            ].map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item
                    ? { backgroundColor: "#d4af37" }
                    : undefined
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
                      No contact information available
                    </p>
                  )}
                </div>
              </Card>
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

  // Render Accounts Section
  if (activeNav === "Accounts") {
    return (
      <AccountsPage
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sidebarTitle="OSLD"
        sidebarSubtitle="Office of Student Leadership and Development"
        orgLogo={orgLogo}
      />
    );
  }

  // Render Submissions Section
  if (activeNav === "Submissions") {
    return (
      <SubmissionsPage
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        orgShortName="OSLD"
        orgFullName="Office of Student Leadership and Development"
        orgLogo={orgLogo}
      />
    );
  }

  // Render Create Account Section
  if (activeNav === "Create Account") {
    return (
      <CreateAccountPage
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        sidebarTitle="OSLD"
        sidebarSubtitle="Office of Student Leadership and Development"
        orgLogo={orgLogo}
      />
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
        sidebarTitle="OSLD"
        sidebarSubtitle="Office of Student Leadership and Development"
        orgLogo={orgLogo}
      />
    );
  }

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
                  OSLD
                </h1>
                <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {[
              "Dashboard",
              "Accounts",
              "Submissions",
              "Form Templates",
              "Create Account",
              "Activity Logs",
              "Officers",
              "Organizations",
            ].map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-[#d4af37] hover:text-[#003b27]"
                }`}
                style={
                  activeNav === item
                    ? { backgroundColor: "#d4af37" }
                    : undefined
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

            {/* Template Upload Section - Only visible when org is selected */}
            {selectedTemplateOrg && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold" style={{ color: "#003b27" }}>
                  Upload Templates for {
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
                    {uploadedTemplates[selectedTemplateOrg]?.fiscal && uploadedTemplates[selectedTemplateOrg].fiscal!.length > 0 ? (
                      <div className="border-2 border-green-300 bg-green-50 rounded-lg p-6">
                        <div className="text-green-600 mb-2 text-center">✓ Template Link Uploaded</div>
                        <div className="space-y-3 mb-4">
                          {uploadedTemplates[selectedTemplateOrg].fiscal!.map((template, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                              <span className="text-sm text-gray-600 truncate flex-1">{template.fileName}</span>
                              <div className="flex gap-2 ml-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(template.fileUrl, '_blank')}
                                >
                                  Open Link
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={async () => {
                                    try {
                                      const { error } = await supabase
                                        .from('form_templates')
                                        .delete()
                                        .eq('organization', selectedTemplateOrg)
                                        .eq('template_type', 'fiscal')
                                        .eq('file_url', template.fileUrl);
                                      
                                      if (error) throw error;
                                      
                                      setUploadedTemplates(prev => ({
                                        ...prev,
                                        [selectedTemplateOrg]: {
                                          ...prev[selectedTemplateOrg],
                                          fiscal: prev[selectedTemplateOrg]?.fiscal?.filter((_, i) => i !== index)
                                        }
                                      }));
                                      showNotif('Template deleted successfully');
                                    } catch (error: any) {
                                      showNotif(`Error deleting template: ${error.message}`);
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Google Drive Link Input */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#d4af37] transition-colors">
                          <div className="text-center mb-4">
                            <Upload className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600 font-medium">Upload Google Drive Link</p>
                            <p className="text-xs text-gray-400 mt-1">Paste the link to a folder containing all fiscal forms</p>
                          </div>
                          <Input
                            type="url"
                            placeholder="Paste Google Drive link here"
                            value={templateLinks[selectedTemplateOrg]?.fiscal || ""}
                            onChange={(e) => {
                              setTemplateLinks(prev => ({
                                ...prev,
                                [selectedTemplateOrg]: {
                                  ...prev[selectedTemplateOrg],
                                  fiscal: e.target.value
                                }
                              }));
                            }}
                            className="w-full"
                          />
                        </div>
                        
                        {templateLinks[selectedTemplateOrg]?.fiscal && (
                          <Button
                            className="w-full mt-4"
                            style={{ backgroundColor: "#003b27" }}
                            disabled={isUploading}
                            onClick={async () => {
                              const link = templateLinks[selectedTemplateOrg]?.fiscal;
                              if (link) {
                                // Save Google Drive link directly to database
                                setIsUploading(true);
                                try {
                                  const { error } = await supabase
                                    .from("form_templates")
                                    .insert({
                                      organization: selectedTemplateOrg,
                                      template_type: "fiscal",
                                      file_name: "Google Drive Link",
                                      file_url: link,
                                      uploaded_at: new Date().toISOString()
                                    });
                                  if (error) throw error;
                                  setUploadedTemplates(prev => ({
                                    ...prev,
                                    [selectedTemplateOrg]: {
                                      ...prev[selectedTemplateOrg],
                                      fiscal: [...(prev[selectedTemplateOrg]?.fiscal || []), { fileName: "Google Drive Link", fileUrl: link }]
                                    }
                                  }));
                                  setTemplateLinks(prev => ({
                                    ...prev,
                                    [selectedTemplateOrg]: { ...prev[selectedTemplateOrg], fiscal: "" }
                                  }));
                                  showNotif('Template link saved successfully');
                                } catch (error: any) {
                                  showNotif(`Error saving link: ${error.message}`);
                                } finally {
                                  setIsUploading(false);
                                }
                              }
                            }}
                          >
                            {isUploading ? "Saving..." : "Save Template"}
                          </Button>
                        )}
                      </>
                    )}
                    {templateStatusMessage[selectedTemplateOrg]?.fiscal && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center text-sm text-green-700">
                        {templateStatusMessage[selectedTemplateOrg].fiscal}
                      </div>
                    )}
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showProfile) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Notification */}
        {showNotification && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
            <div
              className="bg-white border-l-4 shadow-lg rounded-lg p-4 flex items-center gap-3"
              style={{ borderLeftColor: "#003b27" }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: "#003b27" }}
              ></div>
              <span className="font-medium">{notificationMessage}</span>
            </div>
          </div>
        )}

        {/* Sidebar */}
        <div
          className="w-72 text-white flex flex-col shadow-xl"
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
                  OSLD
                </h1>
                <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            {[
              "Dashboard",
              "Accounts",
              "Submissions",
              "Form Templates",
              "Create Account",
              "Activity Logs",
              "Officers",
              "Organizations",
            ].map((item) => (
              <Button
                key={item}
                onClick={() => {
                  setActiveNav(item);
                  setShowProfile(false);
                }}
                className={`w-full justify-start mb-2 text-left font-semibold transition-all ${
                  activeNav === item
                    ? "text-[#003b27]"
                    : "text-white hover:bg-white/10"
                }`}
                style={
                  activeNav === item
                    ? { backgroundColor: "#d4af37" }
                    : undefined
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

        {/* Profile Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-8">
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
                                const fileName = `${selectedOrganization.replace(/\s+/g, '_')}_logo`;
                                const { data: files } = await supabase.storage
                                  .from('osld-files')
                                  .list('logos', { search: fileName });
                                
                                if (files && files.length > 0) {
                                  await supabase.storage
                                    .from('osld-files')
                                    .remove([`logos/${files[0].name}`]);
                                }
                                setOrgLogo("");
                                showNotif("Logo removed successfully");
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

                    {/* Upload Section */}
                    <div className="flex-1 text-center md:text-left">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">
                            Choose File
                          </h4>
                          <p className="text-sm text-gray-500">
                            Supported: PNG, JPG, GIF (Max 5MB)
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <label
                            className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200 hover:shadow-lg hover:scale-105"
                            style={{ backgroundColor: "#003b27" }}
                          >
                            <Upload className="h-5 w-5" />
                            Choose File
                            <Input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const fileExt = file.name.split('.').pop();
                                    const fileName = `${selectedOrganization.replace(/\s+/g, '_')}_logo.${fileExt}`;
                                    const filePath = `logos/${fileName}`;

                                    const { error: uploadError } = await supabase.storage
                                      .from('osld-files')
                                      .upload(filePath, file, { upsert: true });

                                    if (uploadError) throw uploadError;

                                    const { data } = supabase.storage
                                      .from('osld-files')
                                      .getPublicUrl(filePath);

                                    setOrgLogo(data.publicUrl + '?t=' + Date.now());
                                    showNotif("Logo uploaded successfully!");
                                  } catch (error: any) {
                                    console.error("Error uploading logo:", error);
                                    showNotif("Failed to upload logo");
                                  }
                                }
                              }}
                            />
                          </label>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                          Supported: PNG, JPG, GIF (Max 5MB)
                        </div>
                      </div>
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

                {/* Accreditation Plaque */}
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
                <div className="grid md:grid-cols-3 gap-6">
                  <Card
                    className="p-8 shadow-lg border-l-4"
                    style={{ borderLeftColor: "#d4af37" }}
                  >
                    <h3
                      className="text-xl font-bold mb-4"
                      style={{ color: "#003b27" }}
                    >
                      Memorandum
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
                      Announcement
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

                  <Card
                    className="p-8 shadow-lg border-l-4"
                    style={{ borderLeftColor: "#d4af37" }}
                  >
                    <h3
                      className="text-xl font-bold mb-4"
                      style={{ color: "#003b27" }}
                    >
                      Functional Chart
                    </h3>
                    <Input
                      type="file"
                      accept=".pdf"
                      multiple
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                          // Reuse actionPlanFiles or create new state for functional chart
                          setActionPlanFiles(prev => [...prev, ...Array.from(files)]);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">You can upload multiple PDF files</p>
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

        {/* Edit Account Modal */}
        <Dialog
          open={isEditAccountModalOpen}
          onOpenChange={setIsEditAccountModalOpen}
        >
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
                  onClick={() => setShowPassword(!showPassword)}
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
                onClick={() => {
                  setIsEditAccountModalOpen(false);
                  setNewEmail("");
                  setNewPassword("");
                  setVerificationCode("");
                  setSentVerificationCode("");
                  setIsVerificationSent(false);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateAccount}
                disabled={!isVerificationSent}
                className="flex-1"
                style={{ backgroundColor: "#003b27" }}
              >
                Update Account
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
      </div>
    );
  }

  // DEFAULT DASHBOARD VIEW
  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <div
            className="bg-white border-l-4 shadow-lg rounded-lg p-4 flex items-center gap-3"
            style={{ borderLeftColor: "#003b27" }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: "#003b27" }}
            ></div>
            <span className="font-medium">{notificationMessage}</span>
          </div>
        </div>
      )}

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
                OSLD
              </h1>
              <p className="text-xs text-white/60 mt-1">Office of Student Leadership and Development</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          {[
            "Dashboard",
            "Accounts",
            "Submissions",
            "Form Templates",
            "Create Account",
            "Activity Logs",
            "Officers",
            "Organizations",
          ].map((item) => (
            <Button
              key={item}
              onClick={() => {
                setActiveNav(item);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full justify-start mb-2 text-left font-semibold transition-all ${
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
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <h2
              className="text-2xl lg:text-4xl font-bold"
              style={{ color: "#003b27" }}
            >
              Dashboard
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
                                  read_by: 'OSLD'
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
                                .eq('read_by', 'OSLD');
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
                      No notifications yet
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
                                        read_by: 'OSLD'
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
                                    .eq('read_by', 'OSLD');
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
                      setActiveView("TODAY");
                      const today = new Date();
                      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                      setSelectedDate(today);
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
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 lg:gap-2 shadow-inner bg-gray-50 p-2 lg:p-4 rounded-lg overflow-x-auto">
                {renderCalendar()}
              </div>
            </Card>

            {/* Side Panel */}
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
                    const eventColor = getEventColor(event.id);
                    const isToday = 
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
                            <OSLDDeadlineNotification 
                              deadlineType={event.deadlineType}
                              eventId={event.parentEventId}
                              targetOrg={event.targetOrganization}
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
                        style={{ borderColor: isToday ? '#d4af37' : '#e5e7eb' }}
                      >
                        <div 
                          className="px-4 py-3 flex items-center justify-between"
                          style={{ 
                            backgroundColor: isToday ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0, 59, 39, 0.05)',
                            borderBottom: `3px solid ${eventColor}`
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: eventColor }}
                            />
                            <span className="font-bold text-sm" style={{ color: '#003b27' }}>
                              {isToday ? 'Today' : 'Event'}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full hover:bg-white/50"
                              onClick={() => openEditEventModal(event)}
                            >
                              <Edit2 className="h-3.5 w-3.5" style={{ color: "#003b27" }} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full hover:bg-red-50"
                              onClick={() => confirmDeleteEvent(event.id)}
                            >
                              <X className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
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
        </div>
      </div>

      {/* Event Modal */}
      <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              {editingEvent ? "Edit Event" : "Add New Event"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                placeholder="Event title"
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
            
            {/* Recurrence Type */}
            <div>
              <Label>Recurrence Type (Optional)</Label>
              <select
                value={eventRecurrence}
                onChange={(e) => setEventRecurrence(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#003b27] text-base"
              >
                <option value="">None</option>
                <option value="Day(s)">Day(s)</option>
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Every Year">Every Year</option>
                <option value="1st Semester">1st Semester</option>
                <option value="2nd Semester">2nd Semester</option>
              </select>
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
                  onCheckedChange={(checked) =>
                    setEventAllDay(checked as boolean)
                  }
                />
                <Label htmlFor="allDay">All Day</Label>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEventModalOpen(false);
                setFormError("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEvent}
              className="flex-1"
              style={{ backgroundColor: "#003b27" }}
            >
              {editingEvent ? "Update" : "Save"} Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl" style={{ color: "#003b27" }}>
              Delete Event
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-base text-gray-700">
              Are you sure you want to delete this event? This action cannot be
              undone.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeleteEventId(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteEvent}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}