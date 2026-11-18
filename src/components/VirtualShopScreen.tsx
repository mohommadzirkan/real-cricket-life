import React, { useState } from 'react';
import { ArrowLeft, Check, ShoppingBag } from 'lucide-react';
import { SHOP_CATALOG } from '../data/sampleData';
import { PlayerProfile, ShopCategory } from '../types/game';

interface VirtualShopScreenProps {
  profile: PlayerProfile;
  onBack: () => void;
  onBuy: (itemId: string) => { ok: boolean; message: string };
  onEquip: (itemId: string, category: ShopCategory) => void;
}

const CATEGORIES: Array<{ id: ShopCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All Gear' },
  { id: 'bat', label: 'Bats' },
  { id: 'ball', label: 'Balls' },
  { id: 'helmet', label: 'Helmets' },
  { id: 'gloves', label: 'Gloves' },
  { id: 'jersey', label: 'Jerseys' },
  { id: 'accessory', label: 'Accessories' },
];

export const VirtualShopScreen: React.FC<VirtualShopScreenProps> = ({
  profile,
  onBack,
  onBuy,
  onEquip,
}) => {
  const [cat, setCat] = useState<ShopCategory | 'all'>('all');
  const [toast, setToast] = useState<string | null>(null);

  const items = cat === 'all' ? SHOP_CATALOG : SHOP_CATALOG.filter((i) => i.category === cat);
  const rupeeUnits = (profile.virtualPoints / 100).toFixed(2);

  const handleBuy = (id: string) => {
    const res = onBuy(id);
    setToast(res.message);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-[#070B09]/94 p-4 sm:p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F1714] border border-white/12 text-slate-200 flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            VIRTUAL CRICKET SHOP
          </h2>
          <div className="px-4 py-2 rounded-xl bg-[#0D1411] border border-emerald-400/35 text-right tabular-nums">
            <div className="text-xs font-bold text-emerald-400">
              {profile.virtualPoints.toLocaleString()} pts (₹{rupeeUnits} Virtual)
            </div>
            <div className="text-[10px] text-slate-400">
              100 pts = ₹1 Virtual Unit · Non-withdrawable
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#0D1411] border border-white/10 w-fit">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold cursor-pointer ${
                cat === c.id ? 'bg-emerald-500 text-[#05110B]' : 'text-slate-300 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {toast && (
          <div className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400 text-sm text-emerald-200 font-medium">
            {toast}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const owned = profile.ownedItemIds.includes(item.id);
            const equipped = profile.equipped[item.category] === item.id;
            const rupeePrice = (item.pricePoints / 100).toFixed(2);

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-[#0D1411] border border-white/10 flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-11 h-11 rounded-xl border border-white/20 flex items-center justify-center"
                      style={{ backgroundColor: item.previewColor }}
                    >
                      <ShoppingBag className="w-4 h-4 text-white drop-shadow" />
                    </div>
                    <span className="text-xs font-medium text-emerald-400">{item.statBoost}</span>
                  </div>
                  <div>
                    <div className="text-base font-bold text-white">{item.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
                  </div>
                </div>

                {owned ? (
                  <button
                    onClick={() => onEquip(item.id, item.category)}
                    disabled={equipped}
                    className={`min-h-[44px] rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      equipped
                        ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300 cursor-default'
                        : 'bg-[#16221D] hover:bg-emerald-500 hover:text-[#05110B] text-white'
                    }`}
                  >
                    {equipped && <Check className="w-4 h-4" />}
                    <span>{equipped ? 'Equipped on 3D Player' : 'Equip Item'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleBuy(item.id)}
                    className="min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-[#05110B] font-bold text-xs tabular-nums cursor-pointer"
                  >
                    Buy · {item.pricePoints.toLocaleString()} pts (₹{rupeePrice} Virtual)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
