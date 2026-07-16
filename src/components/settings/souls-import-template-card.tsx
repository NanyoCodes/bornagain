'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * @fileOverview Provides a standardized CSV template for missionaries to organize their harvest records.
 */
export function SoulsImportTemplateCard() {
  const { toast } = useToast();

  const handleDownloadTemplate = () => {
    // UTF-8 BOM for Excel compatibility with special characters
    const BOM = '\uFEFF';
    
    const headers = [
      "First Name",
      "Last Name",
      "Gender",
      "Nationality",
      "Email",
      "Phone",
      "Church",
      "Relationship",
      "Location City",
      "Location State",
      "Location Country",
      "Date Won (YYYY-MM-DD)",
      "Source (Personal or Campaign)",
      "Source Details"
    ];

    const exampleRow = [
      "John",
      "Doe",
      "Male",
      "Nigerian",
      "john.doe@example.com",
      "+2348000000000",
      "New Life Church",
      "Friend",
      "Lagos",
      "Lagos State",
      "Nigeria",
      "2024-05-20",
      "Personal",
      ""
    ];

    const csvContent = BOM + [headers.join(","), exampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "testify_souls_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template Downloaded",
      description: "Use this file to organize your records for Kingdom entry.",
    });
  };

  return (
    <Card className="rounded-none sm:rounded-3xl border-x-0 sm:border-x shadow-none border-b-2 sm:border-b bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight">
          <FileSpreadsheet className="h-5 w-5 text-primary" /> Harvest Management
        </CardTitle>
        <CardDescription>
          Prepare your souls list using our standardized spreadsheet template.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/20 rounded-2xl border-2 border-dashed flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Info className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                This template helps you organize convert data before logging it. Proper formatting of <span className="text-foreground font-black">Relationship</span> and <span className="text-foreground font-black">Location</span> fields ensures your follow-up metrics remain accurate.
            </p>
        </div>
        <Button onClick={handleDownloadTemplate} className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary/20">
          <Download className="mr-2 h-4 w-4" />
          DOWNLOAD IMPORT TEMPLATE
        </Button>
      </CardContent>
    </Card>
  );
}
