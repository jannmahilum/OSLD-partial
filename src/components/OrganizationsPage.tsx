import { useState, useEffect } from "react";
import { Menu, LogOut, Users, ChevronRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

interface Officer {
  id: string;
  name: string;
  position: string;
  image?: string;
}

interface OrganizationsPageProps {
  activeNav: string;
  setActiveNav: (nav: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  sidebarTitle?: string;
  sidebarSubtitle?: string;
  orgLogo?: string;
  navItems?: string[];
}

const organizationsList = [
  {
    id: "osld",
    name: "Office of Student Leadership and Development",
    shortName: "OSLD",
  },
  {
    id: "ao",
    name: "Accredited Organizations",
    shortName: "AO",
  },
  {
    id: "lsg",
    name: "Local Student Government",
    shortName: "LSG",
  },
  {
    id: "gsc",
    name: "Graduating Student Council",
    shortName: "GSC",
  },
  {
    id: "used",
    name: "University Student Enterprise Development",
    shortName: "USED",
  },
  {
    id: "coa",
    name: "Commission on Audit",
    shortName: "COA",
  },
  {
    id: "usg",
    name: "University Student Government",
    shortName: "USG",
  },
  {
    id: "lco",
    name: "League of Campus Organization",
    shortName: "LCO",
  },
  {
    id: "tgp",
    name: "The Gold Panicles",
    shortName: "TGP",
  },
];

export default function OrganizationsPage({
  activeNav,
  setActiveNav,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  sidebarTitle = "OSLD",
  sidebarSubtitle = "Office of Student Leadership and Development",
  orgLogo = "",
  navItems = [
    "Dashboard",
    "Accounts",
    "Submissions",
    "Form Templates",
    "Create Account",
    "Activity Logs",
    "Officers",
    "Organizations",
  ],
}: OrganizationsPageProps) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [officers, setOfficers] = useState<{ [key: string]: Officer[] }>({});
  const [advisers, setAdvisers] = useState<{ [key: string]: Officer[] }>({});
  const [loading, setLoading] = useState(false);
  const [socialContacts, setSocialContacts] = useState<{ 
    [key: string]: { 
      facebook?: string; 
      email?: string; 
      phone?: string;
    } 
  }>({});

  const handleLogout = () => {
    window.location.href = "/";
  };

  // Load officers and advisers for selected organization
  useEffect(() => {
    const loadOfficersAndAdvisers = async () => {
      if (!selectedOrg) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("org_officers")
          .select("*")
          .eq("organization", selectedOrg);

        if (!error && data) {
          // Separate officers and advisers based on position
          const loadedOfficers = data.filter(
            (item) => !item.position.toLowerCase().includes("adviser")
          );
          const loadedAdvisers = data.filter((item) =>
            item.position.toLowerCase().includes("adviser")
          );

          setOfficers((prev) => ({
            ...prev,
            [selectedOrg]: loadedOfficers,
          }));
          setAdvisers((prev) => ({
            ...prev,
            [selectedOrg]: loadedAdvisers,
          }));
        }

        // Load social & contact info from org_social_contacts table
        const { data: socialData } = await supabase
          .from("org_social_contacts")
          .select("facebook_url, contact_email, contact_phone")
          .eq("organization", selectedOrg)
          .maybeSingle();

        setSocialContacts((prev) => ({
          ...prev,
          [selectedOrg]: {
            facebook: socialData?.facebook_url || "",
            email: socialData?.contact_email || "",
            phone: socialData?.contact_phone || "",
          },
        }));
      } catch (err) {
        console.error("Error loading officers and advisers:", err);
      }
      setLoading(false);
    };

    loadOfficersAndAdvisers();
  }, [selectedOrg]);

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
                {sidebarTitle}
              </h1>
              <p className="text-xs text-white/60 mt-1">{sidebarSubtitle}</p>
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
            className="text-2xl lg:text-4xl font-bold mb-6"
            style={{ color: "#003b27" }}
          >
            Organizations
          </h2>

          {!selectedOrg ? (
            // Organizations List View
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizationsList.map((org) => (
                <Card
                  key={org.id}
                  className="p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 hover:scale-[1.02]"
                  style={{ borderLeftColor: "#003b27" }}
                  onClick={() => setSelectedOrg(org.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: "#003b27" }}
                      >
                        <Users className="h-6 w-6" style={{ color: "#d4af37" }} />
                      </div>
                      <div>
                        <h3
                          className="font-bold text-lg"
                          style={{ color: "#003b27" }}
                        >
                          {org.shortName}
                        </h3>
                        <p className="text-sm text-gray-600">{org.name}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            // Organization Detail View with Officers
            <div>
              <Button
                variant="ghost"
                onClick={() => setSelectedOrg(null)}
                className="mb-4"
                style={{ color: "#003b27" }}
              >
                ← Back to Organizations
              </Button>

              <Card
                className="p-6 border-t-4"
                style={{ borderTopColor: "#d4af37" }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#003b27" }}
                  >
                    <Users className="h-8 w-8" style={{ color: "#d4af37" }} />
                  </div>
                  <div>
                    <h3
                      className="font-bold text-2xl"
                      style={{ color: "#003b27" }}
                    >
                      {organizationsList.find((o) => o.id === selectedOrg)?.shortName}
                    </h3>
                    <p className="text-gray-600">
                      {organizationsList.find((o) => o.id === selectedOrg)?.name}
                    </p>
                  </div>
                </div>

                <h4
                  className="font-bold text-xl mb-4"
                  style={{ color: "#003b27" }}
                >
                  Advisers
                </h4>

                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading advisers...
                  </div>
                ) : advisers[selectedOrg]?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {advisers[selectedOrg].map((adviser) => {
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 mb-8">
                    No advisers added yet for this organization.
                  </div>
                )}

                <h4
                  className="font-bold text-xl mb-4"
                  style={{ color: "#003b27" }}
                >
                  Officers
                </h4>

                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading officers...
                  </div>
                ) : officers[selectedOrg]?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {officers[selectedOrg].map((officer) => {
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No officers added yet for this organization.
                  </div>
                )}

                {/* Social Media & Contact Section */}
                <h4
                  className="font-bold text-xl mt-8 mb-4"
                  style={{ color: "#003b27" }}
                >
                  Social Media & Contact
                </h4>

                {socialContacts[selectedOrg] ? (
                  <div className="space-y-3">
                    {socialContacts[selectedOrg].facebook && (
                      <p className="text-sm">
                        <span className="font-semibold text-gray-700">Facebook:</span>{" "}
                        <a
                          href={socialContacts[selectedOrg].facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {socialContacts[selectedOrg].facebook}
                        </a>
                      </p>
                    )}
                    {socialContacts[selectedOrg].email && (
                      <p className="text-sm">
                        <span className="font-semibold text-gray-700">Email:</span>{" "}
                        <a
                          href={`mailto:${socialContacts[selectedOrg].email}`}
                          className="text-gray-900 hover:underline"
                        >
                          {socialContacts[selectedOrg].email}
                        </a>
                      </p>
                    )}
                    {socialContacts[selectedOrg].phone && (
                      <p className="text-sm">
                        <span className="font-semibold text-gray-700">Contact Number:</span>{" "}
                        <a
                          href={`tel:${socialContacts[selectedOrg].phone}`}
                          className="text-gray-900 hover:underline"
                        >
                          {socialContacts[selectedOrg].phone}
                        </a>
                      </p>
                    )}
                    {!socialContacts[selectedOrg].facebook && 
                     !socialContacts[selectedOrg].email && 
                     !socialContacts[selectedOrg].phone && (
                      <p className="text-gray-500 text-center py-8">
                        No contact information added yet
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No contact information available
                  </div>
                )}
              </Card>
            </div>
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
    </div>
  );
}
