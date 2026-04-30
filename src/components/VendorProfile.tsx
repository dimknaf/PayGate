'use client';

import {
  Building2, Users, Calendar, TrendingUp, Globe, MapPin,
  DollarSign, Briefcase, Award, ExternalLink
} from 'lucide-react';
import { VendorProfile as VendorProfileType } from '@/lib/types';

export function VendorProfileCard({ vendor }: { vendor: VendorProfileType }) {
  const s = vendor.specterData;

  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-sm">Vendor Profile</h3>
        </div>
        {vendor.trustScore !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-[var(--text-secondary)]">Trust</span>
            <div className="w-16 h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${vendor.trustScore}%`,
                  backgroundColor: vendor.trustScore > 70 ? '#10b981' : vendor.trustScore > 40 ? '#f59e0b' : '#ef4444',
                }}
              />
            </div>
            <span className="text-xs font-mono font-bold">{vendor.trustScore}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Company header */}
        <div>
          <h4 className="text-lg font-bold">{vendor.name}</h4>
          {s?.description && (
            <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{s.description}</p>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3">
          {s?.foundedYear && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Founded {s.foundedYear}</span>
            </div>
          )}
          {s?.employeeCount && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>{s.employeeCount.toLocaleString()} employees</span>
            </div>
          )}
          {s?.growthStage && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span className="capitalize">{s.growthStage}</span>
            </div>
          )}
          {s?.totalFundingUsd && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>${(s.totalFundingUsd / 1_000_000).toFixed(1)}M raised</span>
            </div>
          )}
          {s?.headquarters && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>{s.headquarters}</span>
            </div>
          )}
          {s?.industry && (
            <div className="flex items-center gap-2 text-sm">
              <Briefcase className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>{s.industry}</span>
            </div>
          )}
          {vendor.domain && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <a href={`https://${vendor.domain}`} target="_blank" rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                {vendor.domain}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {s?.operatingStatus && (
            <div className="flex items-center gap-2 text-sm">
              <Award className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span className="capitalize">{s.operatingStatus}</span>
            </div>
          )}
        </div>

        {/* Highlights */}
        {s?.highlights && s.highlights.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Highlights</p>
            <div className="flex flex-wrap gap-1.5">
              {s.highlights.map((h, i) => (
                <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {h.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key people */}
        {vendor.keyPeople && vendor.keyPeople.length > 0 && (
          <div>
            <p className="text-xs text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Key People</p>
            <div className="space-y-1.5">
              {vendor.keyPeople.map((person, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-6 h-6 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[10px] font-medium">
                    {person.name?.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span>{person.name}</span>
                  {person.title && (
                    <span className="text-[var(--text-secondary)]">— {person.title}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Website check */}
        {vendor.websiteCheck && (
          <div className={`p-3 rounded-lg border ${vendor.websiteCheck.looksLegitimate
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-red-500/5 border-red-500/20'
          }`}>
            <p className="text-xs text-[var(--text-secondary)] mb-1 uppercase tracking-wider">Website Verification</p>
            <p className="text-sm">
              {vendor.websiteCheck.looksLegitimate ? '✓ ' : '✗ '}
              {vendor.websiteCheck.description}
            </p>
          </div>
        )}

        {/* Invoice history */}
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">
            {vendor.invoiceCount} invoice{vendor.invoiceCount !== 1 ? 's' : ''} processed
          </span>
          <span className="text-[var(--text-secondary)]">
            £{vendor.totalPaid.toLocaleString()} total paid
          </span>
        </div>
      </div>
    </div>
  );
}
