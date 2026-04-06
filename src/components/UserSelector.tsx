import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/components/UI';
import { cn } from '@/lib/utils';
import { User, UserPlus, Settings } from 'lucide-react';

interface UserSelectorProps {
  users: any[];
  onSelectUser: (user: any) => void;
  onCreateUser: () => void;
}

const SC = {
  initial: { y: 20, opacity: 0 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
  exit: { y: -20, opacity: 0, transition: { duration: 0.2 } },
};

const Ws = {
  container: {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  },
  item: {
    initial: { y: 20, opacity: 0 },
    animate: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
  },
};

const TC = {
  initial: { opacity: 0, rotate: -180 },
  animate: {
    opacity: 1,
    rotate: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 15 },
  },
  exit: { opacity: 0, rotate: 180, transition: { duration: 0.2 } },
};

export const UserSelector = ({ users, onSelectUser, onCreateUser }: UserSelectorProps) => {
  const [selectedUser, setSelectedUser] = useState<any>(users[0] || null);
  const [rotation, setRotation] = useState(0);

  const handleSelect = (user: any) => {
    setRotation((prev) => prev + 1080);
    setSelectedUser(user);
  };

  if (!selectedUser && users.length > 0) {
    setSelectedUser(users[0]);
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      className="w-full flex justify-center py-10"
    >
      <Card className="w-full max-w-md mx-auto overflow-hidden bg-gradient-to-b from-background to-muted/30 border-0 shadow-2xl">
        <div className="p-0">
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: 1,
              height: "8rem",
              transition: {
                height: { type: "spring", stiffness: 100, damping: 20 },
              },
            }}
            className="bg-gradient-to-r from-primary/20 to-primary/10 w-full"
          />
          <div className="px-8 pb-8 -mt-16">
            <motion.div
              className="relative w-40 h-40 mx-auto rounded-full overflow-hidden border-4 bg-background flex items-center justify-center shadow-xl"
              variants={SC}
              layoutId="selectedAvatar"
            >
              <motion.div
                className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800"
                animate={{ rotate: rotation }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              >
                {selectedUser?.user_metadata?.avatar_url ? (
                  <img src={selectedUser.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-400 dark:text-slate-500" />
                )}
              </motion.div>
            </motion.div>

            <motion.div className="text-center mt-4" variants={Ws.item}>
              <motion.h2
                className="text-2xl font-bold text-foreground truncate px-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {selectedUser?.email || 'Nenhum usuário'}
              </motion.h2>
              <motion.p
                className="text-muted-foreground text-sm mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Selecione um usuário para gerenciar
              </motion.p>
              
              {selectedUser && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => onSelectUser(selectedUser)}
                  className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded-full font-bold text-sm shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all flex items-center gap-2 mx-auto"
                >
                  <Settings size={16} />
                  Gerenciar Acessos
                </motion.button>
              )}
            </motion.div>

            <motion.div className="mt-8" variants={Ws.container}>
              <motion.div className="flex flex-wrap justify-center gap-4" variants={Ws.container}>
                {users.map((user) => (
                  <motion.button
                    key={user.id}
                    onClick={() => handleSelect(user)}
                    className={cn(
                      "relative w-12 h-12 rounded-full overflow-hidden border-2",
                      "transition-all duration-300 bg-slate-100 dark:bg-slate-800",
                      selectedUser?.id === user.id ? "border-transparent" : "border-border hover:border-primary/50"
                    )}
                    variants={Ws.item}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                    whileTap={{ y: 0, transition: { duration: 0.2 } }}
                    aria-label={`Select ${user.email}`}
                    aria-pressed={selectedUser?.id === user.id}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-slate-400 dark:text-slate-500" />
                      )}
                    </div>
                    {selectedUser?.id === user.id && (
                      <motion.div
                        className="absolute inset-0 bg-primary/20 ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full"
                        variants={TC}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layoutId="selectedIndicator"
                      />
                    )}
                  </motion.button>
                ))}
                
                <motion.button
                  onClick={onCreateUser}
                  className={cn(
                    "relative w-12 h-12 rounded-full overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700",
                    "transition-all duration-300 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary/50 flex items-center justify-center text-slate-500 hover:text-primary"
                  )}
                  variants={Ws.item}
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  whileTap={{ y: 0, transition: { duration: 0.2 } }}
                  aria-label="Novo Colaborador"
                >
                  <UserPlus size={20} />
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
