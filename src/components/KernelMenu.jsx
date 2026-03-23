import React, { useMemo } from 'react';
import useGameStore from '../store/useGameStore';
import kernelConfig from '../data/kernelConfig.json';

const KernelMenu = () => {
  const store = useGameStore();

  const handlePurchase = (nodeId, cost, isAvailable, isUnlocked) => {
    if (!isUnlocked && isAvailable && store.rootAccessKeys >= cost) {
      store.purchaseKernelNode(nodeId, cost);
    }
  };

  const branches = useMemo(() => Object.values(kernelConfig), []);

  return (
    <div className="flex-1 w-full flex flex-col min-h-0 text-white font-mono space-y-4 pt-2">
      <div className="flex justify-between items-center px-4">
        <h2 className="text-xl font-bold tracking-widest text-emerald-400 border-b border-emerald-500/30 pb-1 flex-1">
          // KERNEL OVERRIDES
        </h2>
        <div className="bg-zinc-900/80 border border-emerald-500/30 rounded px-3 py-1 ml-4 flex items-center space-x-2">
          <span className="text-emerald-500 text-lg">🗝</span>
          <span className="text-sm font-bold text-emerald-100">RAK: {store.rootAccessKeys}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 pb-16 px-4">
        <p className="text-xs text-zinc-400 mb-6 italic">
          "Root Access Keys (RAK) grant deep structural deck modifications. Earned by breaching high-priority targets."
        </p>

        <div className="flex space-x-4">
          {branches.map((branch) => (
            <div key={branch.id} className="flex-1 flex flex-col space-y-4">
              <div className="text-center pb-2 border-b border-zinc-700/50">
                <h3 className={`font-bold text-sm tracking-widest ${
                  branch.id === 'GHOST' ? 'text-emerald-400' :
                  branch.id === 'SLEDGEHAMMER' ? 'text-orange-400' : 'text-fuchsia-400'
                }`}>
                  {branch.name.toUpperCase()}
                </h3>
                <span className="text-[10px] text-zinc-500 block uppercase tracking-wide mt-1">
                  {branch.description}
                </span>
              </div>

              <div className="flex-1 flex flex-col space-y-3 relative">
                {branch.nodes.map((node, index) => {
                  const isUnlocked = store.kernelNodes.includes(node.id);
                  const meetsReq = !node.requires || store.kernelNodes.includes(node.requires);
                  const isAvailable = meetsReq && !isUnlocked;
                  const canAfford = store.rootAccessKeys >= node.cost;

                  let borderColor = "border-zinc-800";
                  let bgColor = "bg-zinc-900/50";
                  let titleColor = "text-zinc-500";
                  let cursor = "cursor-not-allowed";

                  if (isUnlocked) {
                    borderColor = branch.id === 'GHOST' ? 'border-emerald-500/50' : branch.id === 'SLEDGEHAMMER' ? 'border-orange-500/50' : 'border-fuchsia-500/50';
                    bgColor = branch.id === 'GHOST' ? 'bg-emerald-950/20' : branch.id === 'SLEDGEHAMMER' ? 'bg-orange-950/20' : 'bg-fuchsia-950/20';
                    titleColor = branch.id === 'GHOST' ? 'text-emerald-300' : branch.id === 'SLEDGEHAMMER' ? 'text-orange-300' : 'text-fuchsia-300';
                    cursor = "cursor-default";
                  } else if (isAvailable) {
                     if (canAfford) {
                       borderColor = 'border-white/40 hover:border-white';
                       bgColor = 'bg-zinc-800/80 hover:bg-zinc-700/80';
                       titleColor = 'text-white';
                       cursor = "cursor-pointer active:scale-95";
                     } else {
                       borderColor = 'border-zinc-700';
                       bgColor = 'bg-zinc-900';
                       titleColor = 'text-zinc-400';
                       cursor = "cursor-not-allowed";
                     }
                  }

                  return (
                    <div key={node.id} className="relative flex flex-col items-center group">
                      {/* Connection Line to next node (except last one) */}
                      {index < branch.nodes.length - 1 && (
                        <div className={`absolute w-[2px] h-8 -bottom-7 z-0 transition-colors duration-500 ${
                          isUnlocked ? (branch.id === 'GHOST' ? 'bg-emerald-500/50' : branch.id === 'SLEDGEHAMMER' ? 'bg-orange-500/50' : 'bg-fuchsia-500/50') : 'bg-zinc-800'
                        }`} />
                      )}

                      <button
                        onClick={() => handlePurchase(node.id, node.cost, isAvailable, isUnlocked)}
                        disabled={isUnlocked || !isAvailable || !canAfford}
                        className={`w-full relative z-10 p-3 rounded-md border flex flex-col items-center justify-center text-center transition-all duration-300 ${borderColor} ${bgColor} ${cursor}`}
                      >
                         <h4 className={`text-[11px] font-bold uppercase mb-1 ${titleColor} ${node.isCapstone ? 'italic underline underline-offset-2' : ''}`}>
                           {node.name}
                         </h4>
                         <p className={`text-[9px] leading-tight ${isUnlocked ? 'text-zinc-300' : 'text-zinc-500'}`}>
                           {node.description}
                         </p>
                         {!isUnlocked && isAvailable && (
                            <div className={`mt-2 text-[10px] font-bold ${canAfford ? 'text-emerald-400' : 'text-red-500/80'}`}>
                              COST: {node.cost} RAK
                            </div>
                         )}
                         {isUnlocked && (
                             <div className="mt-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                               [ INSTALLED ]
                             </div>
                         )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KernelMenu;