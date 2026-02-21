"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FolderOpen, Plus, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Collection {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  documentCount: number;
  createdAt: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  async function fetchCollections() {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data.data || []);
      }
    } catch {
      toast.error("Kon collecties niet laden.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setCollections([data, ...collections]);
        setName("");
        setDescription("");
        setDialogOpen(false);
        toast.success("Collectie aangemaakt!");
      }
    } catch {
      toast.error("Kon collectie niet aanmaken.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collecties</h1>
          <p className="text-muted-foreground">
            Organiseer documenten in collecties
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0062EB] hover:bg-[#0050C0]">
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe Collectie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nieuwe Collectie</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Naam van de collectie"
                />
              </div>
              <div className="space-y-2">
                <Label>Beschrijving</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optionele beschrijving"
                />
              </div>
              <Button
                onClick={handleCreate}
                className="w-full bg-[#0062EB] hover:bg-[#0050C0]"
                disabled={creating || !name.trim()}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Aanmaken
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 font-medium">Nog geen collecties</p>
            <p className="text-sm text-muted-foreground">
              Maak een collectie aan om documenten te organiseren
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Link key={col._id} href={`/dashboard/collections/${col._id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0062EB]/10">
                    <FolderOpen className="h-5 w-5 text-[#0062EB]" />
                  </div>
                  <h3 className="mb-1 font-semibold">{col.name}</h3>
                  {col.description && (
                    <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                      {col.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    {col.documentCount} documenten
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
