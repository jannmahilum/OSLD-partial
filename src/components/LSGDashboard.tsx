import { useState, useEffect } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  Menu,
  LogOut,
  Edit2,
  X,
  Eye,
  EyeOff,
  ArrowLeft,
  Download,
  Users,
  Upload,
  ExternalLink,
  Building2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import OrganizationsPage from "./OrganizationsPage";
import { supabase } from "../lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

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

// Deadline Appeal Section Component for USG
const DeadlineAppealSection = ({ deadlineType, eventId, targetOrg, appealApproved }: { deadlineType: 'accomplishment' | 'liquidation', eventId: string, targetOrg?: string, appealApproved?: boolean }) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealFile, setAppealFile] = useState<File | null>(null);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [targetOrgAppealSubmitted, setTargetOrgAppealSubmitted] = useState(false);
  const { toast } = useToast();

  const reportType = deadlineType === 'accomplishment' ? 'Accomplishment' : 'Liquidation';

  // Check if appeal was already submitted for this specific event (own org - USG)
  useEffect(() => {
    const checkAppealStatus = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id')
        .eq('organization', 'LSG')
        .eq('submission_type', 'Letter of Appeal')
        .ilike('activity_title', `%${reportType}%`)
        .eq('event_id', eventId)
        .limit(1);
      
      setAppealSubmitted(!!data && data.length > 0);
    };
    checkAppealStatus();
  }, [eventId, reportType]);

  // Check if appeal was submitted by the target org for this specific event
  useEffect(() => {
    const checkTargetOrgAppealStatus = async () => {
      if (!targetOrg || targetOrg === 'USG') return;
      
      // For AO, check if any AO submitted an appeal for this event
      const orgFilter = targetOrg === 'AO' 
        ? ['CAS', 'CBA', 'CCJE', 'CED', 'CNAHS', 'COE', 'CSTE']
        : [targetOrg];
      
      const { data } = await supabase
        .from('submissions')
        .select('id')
        .eq('submission_type', 'Letter of Appeal')
        .ilike('activity_title', `%${reportType}%`)
        .eq('submitted_to', 'USG')
        .eq('event_id', eventId)
        .in('organization', orgFilter)
        .limit(1);
      
      setTargetOrgAppealSubmitted(!!data && data.length > 0);
    };
    checkTargetOrgAppealStatus();
  }, [eventId, targetOrg, reportType]);
  
  // USG can submit appeal for USG events, LSG events are just for notification
  const isOwnDeadline = targetOrg === 'USG';
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
          event_description: `USG is reminding you that today is the deadline for the submission of ${reportType} report.`,
          created_by: 'USG',
          target_org: targetOrg
        });
      setNotificationSent(true);
    }
  };

  const handleSubmitAppeal = async () => {
    if (!appealFile) return;
    
    setSubmitting(true);
    try {
      // USG submits to OSLD
      const submittedTo = 'OSLD';

      // Upload file to storage
      const fileExt = appealFile.name.split('.').pop();
      const storagePath = `USG_appeal_${Date.now()}.${fileExt}`;
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
          organization: 'LSG',
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

      // Send notification to the receiving organization (OSLD)
      await supabase
        .from('notifications')
        .insert({
          event_id: eventId,
          event_title: `Letter of Appeal Submitted`,
          event_description: `USG has submitted a Letter of Appeal for ${reportType} Report. Please review it.`,
          created_by: 'USG',
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

  // Show when target org (AO or LSG) has submitted an appeal to USG (check this first)
  if (targetOrgAppealSubmitted && !isOwnDeadline) {
    return (
      <div className="mt-2 p-3 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-300 rounded-md">
        <p className="text-sm font-medium text-gray-800 mb-2">
          <span className="font-bold" style={{ color: "#003b27" }}>{reportType} Report Due:</span>
        </p>
        <p className="text-sm font-medium text-gray-800 mb-2">
          {reportType} Report Deadline
        </p>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Organization: <span className="font-bold">{targetOrg === 'AO' ? 'Accredited Organizations' : targetOrg === 'LSG' ? 'Local Student Government' : targetOrg}</span>
        </p>
        <p className="text-sm font-medium text-orange-600">
          An organization has submitted a Letter of Appeal. Please check and review it in the Submissions page.
        </p>
      </div>
    );
  }

  // Show when target org (AO or LSG) hasn't submitted an appeal to USG (notify format)
  if (!targetOrgAppealSubmitted && !isOwnDeadline && (targetOrg === 'LSG' || targetOrg === 'AO')) {
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
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-gray-500">Organization:</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              {targetOrg === 'AO' ? 'Accredited Organizations' : 'Local Student Government'}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-red-200">
          {notificationSent ? (
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
          )}
        </div>
      </div>
    );
  }

  // Show when own org (USG) has submitted an appeal
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
          {targetOrg && !isOwnDeadline && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">Organization:</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
                {targetOrg === 'AO' ? 'Accredited Organizations' : targetOrg === 'LSG' ? 'Local Student Government' : targetOrg}
              </span>
            </div>
          )}
        </div>
        <div className="mt-3 pt-3 border-t border-red-200">
          {canSubmitAppeal ? (
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
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: "#003b27", color: "white" }}
            disabled={!appealFile || submitting}
            onClick={handleSubmitAppeal}
          >
            {submitting ? 'Submitting...' : 'Submit Appeal'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAppealForm(false)}
            className="px-4 py-1.5 text-xs font-semibold border"
            style={{ borderColor: "#003b27", color: "#003b27" }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function LSGDashboard() {
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

  // Officers and Advisers state
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [advisers, setAdvisers] = useState<Officer[]>([]);
  const [isOfficerModalOpen, setIsOfficerModalOpen] = useState(false);
  const [isAdviserModalOpen, setIsAdviserModalOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<Officer | null>(null);
  const [editingAdviser, setEditingAdviser] = useState<Officer | null>(null);
  const [officerName, setOfficerName] = useState("");
  const [officerPosition, setOfficerPosition] = useState("");
  const [officerImage, setOfficerImage] = useState("");
  const [adviserName, setAdviserName] = useState("");
  const [adviserPosition, setAdviserPosition] = useState("");
  const [adviserImage, setAdviserImage] = useState("");
  const [platforms, setPlatforms] = useState({ facebook: "" });
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Request to Conduct Activity state
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDuration, setActivityDuration] = useState("");
  const [activityVenue, setActivityVenue] = useState("");
  const [activityParticipants, setActivityParticipants] = useState("");
  const [activityFunds, setActivityFunds] = useState("");
  const [activityBudget, setActivityBudget] = useState("");
  const [activitySDG, setActivitySDG] = useState("");
  const [activityLIKHA, setActivityLIKHA] = useState("");
  const [activityDesignFile, setActivityDesignFile] = useState<File | null>(null);
  const [activityErrors, setActivityErrors] = useState({
    title: false,
    duration: false,
    venue: false,
    participants: false,
    funds: false,
    budget: false,
    sdg: false,
    likha: false,
    designFile: false
  });
  const [hasPendingSubmission, setHasPendingSubmission] = useState(false);
  const [pendingSubmissionStatus, setPendingSubmissionStatus] = useState<string | null>(null);
  const [showPendingDialog, setShowPendingDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Activity Logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isLogDetailOpen, setIsLogDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [logToDelete, setLogToDelete] = useState<any>(null);

  // Events state
  const [events, setEvents] = useState<Event[]>([]);

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
            
            // USG sees deadlines for LSG events (to notify them) and USG events (their own)
            const shouldShowDeadline = e.target_organization === 'LSG' || e.target_organization === 'USG';
            
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
              
              // Add liquidation report deadline (5 working days after event)
              if (e.require_liquidation) {
                // Use override date if appeal was approved, otherwise calculate from end_date
                const liqDeadlineDate = e.liquidation_deadline_override || calculateDeadlineDate(e.end_date, 5);
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
      } catch (error) {
        console.error('Error loading events:', error);
      }
    };
    
    loadEvents();
  }, []);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      // Load from localStorage first (set during login) - use LSG-specific keys
      const storedEmail = localStorage.getItem("lsg_userEmail");
      const storedPassword = localStorage.getItem("lsg_userPassword");
      
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

      // Load notifications - only notifications targeted to LSG or ALL
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .or('target_org.eq.LSG,target_org.eq.ALL')
        .order('created_at', { ascending: false });
      
      // Load read status for LSG
      const { data: readStatusData } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('read_by', 'LSG');
      
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
    };
    loadTemplates();
  }, []);

  // Check for pending submissions
  useEffect(() => {
    const checkPendingSubmission = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('organization', 'LSG')
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
  }, []);

  // Load activity logs
  useEffect(() => {
    const loadActivityLogs = async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*')
        .eq('organization', 'LSG')
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

  // Reload activity logs function
  const reloadActivityLogs = async () => {
    const { data } = await supabase
      .from('submissions')
      .select('*')
      .eq('organization', 'LSG')
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
      .eq('organization', 'LSG')
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

    // Helper to check if a day has events
    const hasEventsOnDay = (day: number) => {
      const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return events.some(event => {
        const start = event.startDate;
        const end = event.endDate || event.startDate;
        return dateStr >= start && dateStr <= end;
      });
    };

    // Helper to check if a day has deadline events
    const hasDeadlineOnDay = (day: number) => {
      const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return events.some(event => {
        if (!event.isDeadline) return false;
        const start = event.startDate;
        const end = event.endDate || event.startDate;
        return dateStr >= start && dateStr <= end;
      });
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === todayDay &&
        currentDate.getMonth() === todayMonth &&
        currentDate.getFullYear() === todayYear;
      const dayDate = new Date(year, currentDate.getMonth(), day);
      const hasEvents = hasEventsOnDay(day);
      const hasDeadline = hasDeadlineOnDay(day);

      const bgStyle = isToday
        ? { backgroundColor: "rgba(212, 175, 55, 0.2)" }
        : {};

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(dayDate)}
          style={bgStyle}
          className={`p-2 cursor-pointer rounded-lg min-h-[80px] border ${!isToday ? 'bg-white' : ''} hover:bg-gray-100 relative transition-colors`}
        >
          <div className="text-lg font-semibold text-left">{day}</div>
          {hasEvents && (
            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full" style={{ backgroundColor: "#003b27" }}></div>
          )}
          {hasDeadline && (
            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-red-500"></div>
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

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
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
    const diffTime = current.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1;
  };

  const renderMonthPicker = () => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
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

  // Officer functions
  const openAddOfficerModal = () => {
    setEditingOfficer(null);
    setOfficerName("");
    setOfficerPosition("");
    setOfficerImage("");
    setIsOfficerModalOpen(true);
  };

  const openEditOfficerModal = (officer: Officer) => {
    setEditingOfficer(officer);
    setOfficerName(officer.name);
    setOfficerPosition(officer.position);
    setOfficerImage(officer.image || "");
    setIsOfficerModalOpen(true);
  };

  const handleSaveOfficer = async () => {
    if (!officerName.trim() || !officerPosition.trim()) return;
    
    try {
      if (editingOfficer) {
        // Update existing officer
        const { error } = await supabase
          .from("org_officers")
          .update({
            name: officerName,
            position: officerPosition,
            image: officerImage || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingOfficer.id);

        if (error) throw error;

        const newOfficer: Officer = {
          id: editingOfficer.id,
          name: officerName,
          position: officerPosition,
          image: officerImage,
        };
        setOfficers(officers.map(o => o.id === editingOfficer.id ? newOfficer : o));
      } else {
        // Add new officer
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: "lsg",
            name: officerName,
            position: officerPosition,
            image: officerImage || null,
          })
          .select()
          .single();

        if (error) throw error;

        const newOfficer: Officer = {
          id: data.id,
          name: officerName,
          position: officerPosition,
          image: officerImage,
        };
        setOfficers([...officers, newOfficer]);
      }

      setIsOfficerModalOpen(false);
      setOfficerName("");
      setOfficerPosition("");
      setOfficerImage("");
      setEditingOfficer(null);
    } catch (error) {
      console.error("Error saving officer:", error);
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

  // Adviser functions
  const openAddAdviserModal = () => {
    setEditingAdviser(null);
    setAdviserName("");
    setAdviserPosition("");
    setAdviserImage("");
    setIsAdviserModalOpen(true);
  };

  const openEditAdviserModal = (adviser: Officer) => {
    setEditingAdviser(adviser);
    setAdviserName(adviser.name);
    setAdviserPosition(adviser.position);
    setAdviserImage(adviser.image || "");
    setIsAdviserModalOpen(true);
  };

  const handleSaveAdviser = async () => {
    if (!adviserName.trim() || !adviserPosition.trim()) return;
    
    // Ensure position includes "Adviser" for proper categorization
    const finalPosition = adviserPosition.toLowerCase().includes("adviser")
      ? adviserPosition
      : `${adviserPosition} Adviser`;
    
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

        const newAdviser: Officer = {
          id: editingAdviser.id,
          name: adviserName,
          position: finalPosition,
          image: adviserImage,
        };
        setAdvisers(advisers.map(a => a.id === editingAdviser.id ? newAdviser : a));
      } else {
        // Add new adviser
        const { data, error } = await supabase
          .from("org_officers")
          .insert({
            organization: "lsg",
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
      setAdviserPosition("");
      setAdviserImage("");
      setEditingAdviser(null);
    } catch (error) {
      console.error("Error saving adviser:", error);
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "officer" | "adviser") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === "officer") {
          setOfficerImage(reader.result as string);
        } else {
          setAdviserImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Load officers and advisers from database on mount
  useEffect(() => {
    const loadOfficersAndAdvisers = async () => {
      try {
        const { data, error } = await supabase
          .from("org_officers")
          .select("*")
          .eq("organization", "lsg");

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

    loadOfficersAndAdvisers();
  }, []);

  const navItems = [
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
                className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
                style={{ ringColor: "#d4af37" }}
              >
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  LSG
                </h1>
                <p className="text-xs text-white/60 mt-1">Local Student Government</p>
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
          </nav>

          <div className="px-4 pb-6 border-t border-white/10 pt-4">
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
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
      </div>
    );
  }

  // Define SDG and LIKHA options
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
    // Check if there's already a pending submission
    if (hasPendingSubmission) {
      setShowPendingDialog(true);
      return;
    }

    // Validate all required fields
    const errors = {
      title: !activityTitle,
      duration: !activityDuration,
      venue: !activityVenue,
      participants: !activityParticipants,
      funds: !activityFunds,
      budget: !activityBudget,
      sdg: !activitySDG,
      likha: !activityLIKHA,
      designFile: !activityDesignFile
    };
    
    setActivityErrors(errors);
    
    if (Object.values(errors).some(error => error)) {
      return;
    }
    
    try {
      // Upload file to storage
      const fileExt = activityDesignFile!.name.split('.').pop();
      const fileName = `LSG_${Date.now()}.${fileExt}`;
      const filePath = `activity-designs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('osld-files')
        .upload(filePath, activityDesignFile!);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('osld-files')
        .getPublicUrl(filePath);

      // LSG submissions go to USG
      const { data: submissionData, error: dbError } = await supabase
        .from('submissions')
        .insert({
          organization: 'LSG',
          submission_type: 'Request to Conduct Activity',
          activity_title: activityTitle,
          activity_duration: activityDuration,
          activity_venue: activityVenue,
          activity_participants: activityParticipants,
          activity_funds: activityFunds,
          activity_budget: activityBudget,
          activity_sdg: activitySDG,
          activity_likha: activityLIKHA,
          file_url: publicUrl,
          file_name: activityDesignFile!.name,
          status: 'Pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Create notification for USG (LSG -> USG)
      await supabase
        .from('notifications')
        .insert({
          event_id: submissionData.id,
          event_title: 'New Request from Local Student Government',
          event_description: `Local Student Government submitted a Request to Conduct Activity titled "${activityTitle}". Check it out!`,
          created_by: 'LSG',
          target_org: 'USG'
        });

      setShowSuccessDialog(true);
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
    setActivityDuration("");
    setActivityVenue("");
    setActivityParticipants("");
    setActivityFunds("");
    setActivityBudget("");
    setActivitySDG("");
    setActivityLIKHA("");
    setActivityDesignFile(null);
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
                className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
                style={{ ringColor: "#d4af37" }}
              >
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  LSG
                </h1>
                <p className="text-xs text-white/60 mt-1">Local Student Government</p>
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
          </nav>
          <div className="px-4 pb-6 border-t border-white/10 pt-4">
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
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
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: "#003b27" }}>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Document Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                          No activity logs yet. Submissions will appear here once they are made.
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-900">{log.documentName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{log.type}</td>
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
                                variant="outline"
                                className="text-xs border-[#003b27] text-[#003b27] hover:bg-[#003b27] hover:text-white"
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
                                className="text-xs border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
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
      </div>
    );
  }

  // Render Officers Section
  if (activeNav === "Officers") {
    return (
      <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Button
          className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
          style={{ backgroundColor: "#003b27" }}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
        </Button>

        <div
          className={`${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
          style={{ backgroundColor: "#003b27" }}
        >
          <div className="p-5 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
                style={{ ringColor: "#d4af37" }}
              >
                <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold leading-tight" style={{ color: "#d4af37" }}>
                  LSG
                </h1>
                <p className="text-xs text-white/60 mt-1">Local Student Government</p>
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
          </nav>

          <div className="px-4 pb-6 border-t border-white/10 pt-4">
            <Button
              onClick={() => setIsLogoutDialogOpen(true)}
              className="w-full justify-start text-left font-semibold transition-all text-white hover:bg-red-600"
              variant="ghost"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
        )}

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
                <h3
                  className="text-2xl font-bold mb-6"
                  style={{ color: "#003b27" }}
                >
                  Advisers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {advisers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No advisers added yet
                    </p>
                  ) : (
                    advisers.map((adviser) => (
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
                        <div className="text-center">
                          <h4 className="font-bold text-lg mb-1">
                            {adviser.name}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {adviser.position}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Officers Section - SECOND */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <h3
                  className="text-2xl font-bold mb-6"
                  style={{ color: "#003b27" }}
                >
                  Officers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {officers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 col-span-full">
                      No officers added yet
                    </p>
                  ) : (
                    officers.map((officer) => (
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
                        <div className="text-center">
                          <h4 className="font-bold text-lg mb-1">
                            {officer.name}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {officer.position}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Social Media & Contact - THIRD */}
              <Card
                className="p-8 shadow-xl border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <h3
                  className="text-2xl font-bold mb-6"
                  style={{ color: "#003b27" }}
                >
                  Social Media & Contact
                </h3>
                <div className="space-y-4">
                  {platforms.facebook && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Label className="text-base font-medium mb-2 block">
                        Facebook Page
                      </Label>
                      <a
                        href={platforms.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        {platforms.facebook}
                      </a>
                    </div>
                  )}
                  {contactEmail && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <Label className="text-base font-medium mb-2 block">
                        Contact Email
                      </Label>
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-green-600 hover:underline font-semibold"
                      >
                        {contactEmail}
                      </a>
                    </div>
                  )}
                  {contactPhone && (
                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <Label className="text-base font-medium mb-2 block">
                        Contact Phone
                      </Label>
                      <a
                        href={`tel:${contactPhone}`}
                        className="text-purple-600 hover:underline font-semibold"
                      >
                        {contactPhone}
                      </a>
                    </div>
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
        sidebarTitle="Local Student Government"
        navItems={navItems}
      />
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Button
        className="lg:hidden fixed top-4 left-4 z-50 rounded-full w-12 h-12 shadow-lg"
        style={{ backgroundColor: "#003b27" }}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-6 w-6" style={{ color: "#d4af37" }} />
      </Button>

      <div
        className={`${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative w-72 h-full text-white flex flex-col shadow-xl transition-transform duration-300 z-40`}
        style={{ backgroundColor: "#003b27" }}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-offset-1 ring-offset-[#003b27] flex items-center justify-center bg-white/10"
              style={{ ringColor: "#d4af37" }}
            >
              <Building2 className="w-6 h-6" style={{ color: "#d4af37" }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight" style={{ color: "#d4af37" }}>
                Local Student Government
              </h1>
              <p className="text-xs text-white/60 mt-1">Management System</p>
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

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <div className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {activeNav === "Request to Conduct Activity" ? (
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-2xl lg:text-3xl font-bold text-center mb-8"
                style={{ color: "#003b27" }}
              >
                REQUEST TO CONDUCT ACTIVITY
              </h2>

              {hasPendingSubmission && (
                <div className="mb-6 p-4 rounded-lg border bg-yellow-50 border-yellow-300">
                  <p className="font-medium text-yellow-800">
                    ⏳ You still have a pending request. Please wait for it to be reviewed before submitting another activity request.
                  </p>
                </div>
              )}

              <Card className="p-6 lg:p-8 shadow-xl border-t-4" style={{ borderTopColor: "#d4af37" }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Activity Title */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Activity Title :</Label>
                    <Input
                      value={activityTitle}
                      onChange={(e) => setActivityTitle(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.title && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Duration :</Label>
                    <Input
                      value={activityDuration}
                      onChange={(e) => setActivityDuration(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.duration && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Venue/Platform */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Venue/Platform :</Label>
                    <Input
                      value={activityVenue}
                      onChange={(e) => setActivityVenue(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.venue && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Target Participants */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Target Participants :</Label>
                    <Input
                      value={activityParticipants}
                      onChange={(e) => setActivityParticipants(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.participants && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Source of Funds */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Source of Funds:</Label>
                    <Input
                      value={activityFunds}
                      onChange={(e) => setActivityFunds(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.funds && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* Budgetary Requirements */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Budgetary Requirements :</Label>
                    <Input
                      value={activityBudget}
                      onChange={(e) => setActivityBudget(e.target.value)}
                      className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]"
                    />
                    {activityErrors.budget && (
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* SDG's */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">SDG's</Label>
                    <Select value={activitySDG} onValueChange={setActivitySDG}>
                      <SelectTrigger className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]">
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
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>

                  {/* LIKHA AGENDA */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">LIKHA AGENDA</Label>
                    <Select value={activityLIKHA} onValueChange={setActivityLIKHA}>
                      <SelectTrigger className="border-gray-300 focus:border-[#003b27] focus:ring-[#003b27]">
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
                      <p className="text-red-500 text-xs mt-1">Please fill up this field</p>
                    )}
                  </div>
                </div>

                {/* Upload Activity Design */}
                <div className="mt-6">
                  <label className="block">
                    <div
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg cursor-pointer transition-all hover:opacity-90"
                      style={{ backgroundColor: "#4a5568", color: "white" }}
                    >
                      <Upload className="h-5 w-5" />
                      <span>Upload Activity Design</span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setActivityDesignFile(file);
                        }
                      }}
                    />
                  </label>
                  {activityDesignFile && (
                    <p className="mt-2 text-sm text-gray-600 text-center">
                      Selected: {activityDesignFile.name}
                    </p>
                  )}
                  {activityErrors.designFile && (
                    <p className="text-red-500 text-xs mt-1 text-center">Please upload a file</p>
                  )}
                </div>

                {/* Submit and Cancel Buttons */}
                <div className="flex gap-4 mt-8">
                  <Button
                    className="flex-1 py-3 text-white font-semibold"
                    style={{ backgroundColor: hasPendingSubmission ? "#9ca3af" : "#22c55e" }}
                    onClick={handleSubmitActivity}
                    disabled={hasPendingSubmission}
                  >
                    SUBMIT
                  </Button>
                  <Button
                    className="flex-1 py-3 text-white font-semibold"
                    style={{ backgroundColor: "#ef4444" }}
                    onClick={handleCancelActivity}
                  >
                    CANCEL
                  </Button>
                </div>
              </Card>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6 lg:mb-8">
                <h2
                  className="text-2xl lg:text-4xl font-bold"
                  style={{ color: "#003b27" }}
                >
                  LSG Dashboard
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
                                  read_by: 'LSG'
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
                                .eq('read_by', 'LSG');
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
                                        read_by: 'LSG'
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
                                    .eq('read_by', 'LSG');
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
                      setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                      setSelectedDate(today);
                    }}
                    className="font-semibold px-3 lg:px-6 transition-all hover:scale-105 hover:shadow-md text-xs lg:text-sm"
                    style={{
                      backgroundColor: "#d4af37",
                      color: "#003b27",
                    }}
                  >
                    INBOX
                  </Button>
                  <Button
                    size="sm"
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
                    const today = new Date();
                    const isToday = selectedDate.toDateString() === today.toDateString();
                    
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
                            {isToday && event.deadlineType && (
                              <DeadlineAppealSection 
                                deadlineType={event.deadlineType} 
                                eventId={event.parentEventId || event.id}
                                targetOrg={event.targetOrganization}
                              />
                            )}
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
                            borderBottom: '3px solid #003b27'
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: '#003b27' }}
                            />
                            <span className="font-bold text-sm" style={{ color: '#003b27' }}>
                              {isToday ? 'Today' : 'Event'}
                            </span>
                          </div>
                          <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: "#d4af37", color: "#003b27" }}>
                            Day {dayNumber}
                          </span>
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
      <Toaster />
    </div>
  );
}
