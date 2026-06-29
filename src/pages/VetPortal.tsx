import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandAvatar } from "@/components/BrandAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDIAN_STATES } from "@/lib/india-regions";
import { detectLocation, getGeoCoords } from "@/lib/location";
import { fetchVetStats, registerVetProfessional } from "@/lib/vet-api";
import type { VetProfessionalType } from "@/lib/vet-types";
import { ArrowLeft, MapPin, Stethoscope } from "lucide-react";
import { toast } from "sonner";

export default function VetPortal() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, vets: 0, paravets: 0, registered: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    type: "vet" as VetProfessionalType,
    name: "",
    phone: "",
    email: "",
    qualification: "",
    college: "",
    licenseBody: "Veterinary Council of India",
    registrationNumber: "",
    village: "",
    city: "",
    district: "",
    state: "",
    stateCode: "UP",
    lat: 26.85,
    lng: 80.95,
    yearsExperience: 3,
  });

  useEffect(() => {
    void fetchVetStats().then(setStats);
  }, []);

  const detectGps = async () => {
    setLocating(true);
    try {
      const coords = await getGeoCoords();
      const loc = await detectLocation();
      if (coords) {
        setForm((f) => ({
          ...f,
          lat: coords.lat,
          lng: coords.lng,
          city: loc?.district || f.city,
          district: loc?.district || f.district,
          state: loc?.state || f.state,
        }));
        toast.success("GPS location captured");
      } else {
        toast.error("Could not get GPS. Allow location permission.");
      }
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const stateRow = INDIAN_STATES.find((s) => s.code === form.stateCode);
      await registerVetProfessional({
        ...form,
        state: stateRow?.name || form.state,
        stateCode: form.stateCode,
      });
      toast.success("Registration successful! Farmers can now find you nearby.");
      navigate("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-background">
      <header className="bg-header text-header-foreground px-4 py-3 flex items-center gap-3 border-b border-black/10 shrink-0">
        <Link to="/" className="p-1.5 rounded-lg hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <BrandAvatar size="sm" variant="header" />
        <div className="flex-1">
          <div className="font-semibold flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Vet & Paravet Portal
          </div>
          <div className="text-[11px] opacity-85">
            {stats.total.toLocaleString()}+ professionals in directory ({stats.vets.toLocaleString()} vets, {stats.paravets.toLocaleString()} paravets)
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        <div className="rounded-xl border bg-card p-4 mb-4 text-sm text-muted-foreground">
          First-time registration for veterinarians and paravets. Your GPS location helps farmers find you when they need disease consultation.
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>I am a</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({
                ...f,
                type: v as VetProfessionalType,
                licenseBody: v === "vet" ? "Veterinary Council of India" : "State Animal Husbandry Dept",
              }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vet">Veterinarian (BVSc & AH)</SelectItem>
                <SelectItem value="paravet">Paravet / Livestock Health Worker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Full name</Label>
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Dr. Rajesh Sharma" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Mobile</Label>
              <Input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Qualification</Label>
            <Input required value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))} placeholder="BVSc & AH" />
          </div>

          <div className="space-y-2">
            <Label>College / Training institute</Label>
            <Input required value={form.college} onChange={(e) => setForm((f) => ({ ...f, college: e.target.value }))} placeholder="IVRI Bareilly" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>License body</Label>
              <Input required value={form.licenseBody} onChange={(e) => setForm((f) => ({ ...f, licenseBody: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Registration no.</Label>
              <Input required value={form.registrationNumber} onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))} placeholder="VCI/UP/2018/12345" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Years of experience</Label>
            <Input required type="number" min={0} max={50} value={form.yearsExperience} onChange={(e) => setForm((f) => ({ ...f, yearsExperience: Number(e.target.value) }))} />
          </div>

          <div className="space-y-2">
            <Label>State</Label>
            <Select value={form.stateCode} onValueChange={(v) => setForm((f) => ({ ...f, stateCode: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDIAN_STATES.map((s) => (
                  <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>District</Label>
              <Input required value={form.district} onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>City / Block</Label>
              <Input required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Village (optional)</Label>
            <Input value={form.village} onChange={(e) => setForm((f) => ({ ...f, village: e.target.value }))} />
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> GPS location
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={detectGps} disabled={locating}>
                {locating ? "Detecting…" : "Use my location"}
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Lat: {form.lat.toFixed(5)}, Lng: {form.lng.toFixed(5)}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Registering…" : "Register as Vet / Paravet"}
          </Button>
        </form>
      </main>
    </div>
  );
}
