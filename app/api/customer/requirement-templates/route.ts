import { NextResponse } from 'next/server';
import { getCatalogDocument } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import { requirementDocumentLabel, requirementDocumentOptions } from '@/lib/requirements/labels';
import type { CustomerRequirementTemplate } from '@/lib/requirements/types';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('customer_requirement_templates')
      .select('id, document_id, krav_beskrivelse, aktiv, created_at')
      .eq('aktiv', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const templates: CustomerRequirementTemplate[] = (data ?? []).map((row) => ({
      id: row.id as string,
      documentId: row.document_id as string,
      label: requirementDocumentLabel(row.document_id as string),
      kravBeskrivelse: (row.krav_beskrivelse as string | null) ?? null,
      aktiv: !!row.aktiv,
      createdAt: row.created_at as string,
    }));

    return NextResponse.json({
      templates,
      documentOptions: requirementDocumentOptions(),
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const { data: membership } = await supabase
      .from('customer_users')
      .select('customer_organization_id')
      .eq('auth_user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership?.customer_organization_id) {
      return NextResponse.json(
        { error: 'Ingen kundeorganisasjon knyttet til brukeren' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      documentId?: string;
      kravBeskrivelse?: string;
    };
    const documentId = body.documentId?.trim();
    if (!documentId) {
      return NextResponse.json({ error: 'Mangler dokumenttype' }, { status: 400 });
    }
    if (!getCatalogDocument(documentId as DocumentId)) {
      return NextResponse.json({ error: 'Ukjent dokumenttype' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('customer_requirement_templates')
      .upsert(
        {
          customer_organization_id: membership.customer_organization_id,
          document_id: documentId,
          krav_beskrivelse: body.kravBeskrivelse?.trim() || null,
          aktiv: true,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_organization_id,document_id' }
      )
      .select('id, document_id, krav_beskrivelse, aktiv, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json(
      {
        template: {
          id: data.id,
          documentId: data.document_id,
          label: requirementDocumentLabel(data.document_id),
          kravBeskrivelse: data.krav_beskrivelse,
          aktiv: data.aktiv,
          createdAt: data.created_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json()) as { id?: string; aktiv?: boolean };
    if (!body.id || body.aktiv !== false) {
      return NextResponse.json(
        { error: 'Forventet { id, aktiv: false }' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('customer_requirement_templates')
      .update({
        aktiv: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .select('id, aktiv')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Krav ikke funnet' }, { status: 404 });
    }

    return NextResponse.json({ template: data });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
