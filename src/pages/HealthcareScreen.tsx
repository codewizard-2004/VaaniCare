import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { VoiceIndicator } from '@/components/VoiceButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/contexts/TranslationContext';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { 
  User, 
  Calendar, 
  Clock, 
  Star, 
  IndianRupee,
  Stethoscope,
  Heart,
  Brain,
  Bone,
  Baby,
  Ear,
  CheckCircle2,
  Mic,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthcareScreenProps {
  onBack: () => void;
}

type Specialty = 'general' | 'cardio' | 'derma' | 'ortho' | 'pediatric' | 'gynec' | 'neuro' | 'ent';

interface Doctor {
  id: string;
  name: string;
  specialty: Specialty;
  experience: number;
  rating: number;
  fee: number;
  available: string[];
}

const specialtyIcons: Record<Specialty, React.ElementType> = {
  general: Stethoscope,
  cardio: Heart,
  derma: User,
  ortho: Bone,
  pediatric: Baby,
  gynec: User,
  neuro: Brain,
  ent: Ear,
};

// Mock doctor data
const mockDoctors: Doctor[] = [
  { id: '1', name: 'Dr. Priya Sharma', specialty: 'general', experience: 15, rating: 4.8, fee: 300, available: ['10:00 AM', '11:00 AM', '2:00 PM'] },
  { id: '2', name: 'Dr. Rajesh Kumar', specialty: 'cardio', experience: 20, rating: 4.9, fee: 500, available: ['9:00 AM', '12:00 PM', '4:00 PM'] },
  { id: '3', name: 'Dr. Anitha Menon', specialty: 'pediatric', experience: 12, rating: 4.7, fee: 350, available: ['10:00 AM', '3:00 PM', '5:00 PM'] },
  { id: '4', name: 'Dr. Suresh Nair', specialty: 'ortho', experience: 18, rating: 4.6, fee: 450, available: ['11:00 AM', '2:00 PM'] },
  { id: '5', name: 'Dr. Lakshmi Iyer', specialty: 'derma', experience: 10, rating: 4.5, fee: 400, available: ['9:00 AM', '1:00 PM', '4:00 PM'] },
];

export function HealthcareScreen({ onBack }: HealthcareScreenProps) {
  const { t, currentLanguage } = useTranslation();
  const [step, setStep] = useState<'specialty' | 'doctors' | 'time' | 'confirm' | 'success'>('specialty');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');
  const shouldListenAfterSpeakRef = useRef(true);

  const { isListening, startListening } = useVoiceRecognition({
    language: currentLanguage,
    onResult: handleVoiceResult,
    onStart: () => setStatusText(t('app.listening')),
    onError: () => {
      setTimeout(() => {
        if (shouldListenAfterSpeakRef.current) startListening();
      }, 1000);
    }
  });

  const { speak, isSpeaking } = useSpeechSynthesis({
    language: currentLanguage,
    rate: 0.9,
    onEnd: () => {
      if (shouldListenAfterSpeakRef.current) {
        setTimeout(() => startListening(), 300);
      }
    }
  });

  function handleVoiceResult(text: string, isFinal: boolean) {
    if (!isFinal) return;
    
    const normalized = text.toLowerCase();
    
    // Handle back/cancel
    if (normalized.includes('back') || normalized.includes('cancel') || 
        normalized.includes('തിരികെ') || normalized.includes('റദ്ദാക്കുക')) {
      if (step === 'specialty') {
        shouldListenAfterSpeakRef.current = false;
        onBack();
      } else if (step === 'doctors') {
        setStep('specialty');
      } else if (step === 'time') {
        setStep('doctors');
      } else if (step === 'confirm') {
        setStep('time');
      }
      return;
    }

    // Handle yes/confirm
    if (step === 'confirm' && 
        (normalized.includes('yes') || normalized.includes('confirm') || 
         normalized.includes('അതെ') || normalized.includes('ശരി'))) {
      handleBooking();
      return;
    }

    // Handle specialty selection
    if (step === 'specialty') {
      const specialties: Specialty[] = ['general', 'cardio', 'derma', 'ortho', 'pediatric', 'gynec', 'neuro', 'ent'];
      for (const spec of specialties) {
        const specName = t(`doctor.specialties.${spec}`).toLowerCase();
        if (normalized.includes(specName) || normalized.includes(spec)) {
          handleSpecialtySelect(spec);
          return;
        }
      }
    }

    // Handle number selection for doctors
    if (step === 'doctors') {
      const filtered = mockDoctors.filter(d => d.specialty === selectedSpecialty);
      const numbers = ['one', 'two', 'three', 'four', 'five', 'ഒന്ന്', 'രണ്ട്', 'മൂന്ന്', 'നാല്', 'അഞ്ച്'];
      for (let i = 0; i < Math.min(filtered.length, 5); i++) {
        if (normalized.includes(String(i + 1)) || normalized.includes(numbers[i])) {
          handleDoctorSelect(filtered[i]);
          return;
        }
      }
    }

    // Handle time selection
    if (step === 'time' && selectedDoctor) {
      for (const time of selectedDoctor.available) {
        if (normalized.includes(time.toLowerCase().replace(/\s/g, ''))) {
          handleTimeSelect(time);
          return;
        }
      }
    }

    setStatusText(t('voice.tryAgain'));
    speak(t('voice.tryAgain'));
  }

  // Speak instructions when step changes
  useEffect(() => {
    const instructions: Record<string, string> = {
      specialty: t('doctor.selectSpecialty'),
      doctors: t('doctor.availableDoctors'),
      time: t('doctor.selectTime'),
      confirm: t('doctor.confirmBooking'),
      success: t('doctor.bookingConfirmed'),
    };
    
    const instruction = instructions[step];
    if (instruction) {
      setTimeout(() => {
        speak(instruction);
        setStatusText(instruction);
      }, 300);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpecialtySelect = (specialty: Specialty) => {
    setSelectedSpecialty(specialty);
    const specName = t(`doctor.specialties.${specialty}`);
    speak(specName);
    setStep('doctors');
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    speak(doctor.name);
    setStep('time');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    speak(time);
    setStep('confirm');
  };

  const handleBooking = () => {
    setStep('success');
    shouldListenAfterSpeakRef.current = false;
    speak(t('doctor.bookingConfirmed'));
  };

  const filteredDoctors = mockDoctors.filter(d => d.specialty === selectedSpecialty);

  const specialties: Specialty[] = ['general', 'cardio', 'derma', 'ortho', 'pediatric', 'gynec', 'neuro', 'ent'];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-red-50 to-background dark:from-red-950/20">
      <Header 
        title={t('doctor.title')} 
        showBack 
        onBack={onBack}
      />

      <main className="flex-1 flex flex-col px-4 py-6">
        <div className="max-w-lg mx-auto w-full flex flex-col gap-6">
          {/* Status */}
          <div className="text-center">
            <p className={cn(
              'text-lg sm:text-xl',
              isSpeaking && 'text-green-600 font-medium',
              isListening && 'text-primary font-medium'
            )}>
              {statusText}
            </p>
          </div>

          {/* Step: Select Specialty */}
          {step === 'specialty' && (
            <div className="grid grid-cols-2 gap-3">
              {specialties.map((spec) => {
                const Icon = specialtyIcons[spec];
                return (
                  <Button
                    key={spec}
                    variant="outline"
                    className="h-24 flex-col gap-2 text-base"
                    onClick={() => handleSpecialtySelect(spec)}
                  >
                    <Icon className="w-8 h-8 text-red-500" />
                    <span>{t(`doctor.specialties.${spec}`)}</span>
                  </Button>
                );
              })}
            </div>
          )}

          {/* Step: Select Doctor */}
          {step === 'doctors' && (
            <div className="space-y-3">
              {filteredDoctors.map((doctor, index) => (
                <Card 
                  key={doctor.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-lg',
                    selectedDoctor?.id === doctor.id && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleDoctorSelect(doctor)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <User className="w-8 h-8 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{index + 1}. {doctor.name}</p>
                        <p className="text-muted-foreground">{t(`doctor.specialties.${doctor.specialty}`)}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {doctor.experience} {t('doctor.experience')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            {doctor.rating}
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee className="w-4 h-4" />
                            {doctor.fee}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step: Select Time */}
          {step === 'time' && selectedDoctor && (
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <User className="w-10 h-10 text-red-600" />
                    <div>
                      <p className="font-semibold">{selectedDoctor.name}</p>
                      <p className="text-muted-foreground">{t(`doctor.specialties.${selectedDoctor.specialty}`)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                {selectedDoctor.available.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'outline'}
                    className="h-16 text-lg"
                    onClick={() => handleTimeSelect(time)}
                  >
                    <Clock className="w-5 h-5 mr-2" />
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && selectedDoctor && selectedTime && (
            <div className="space-y-4">
              <Card className="bg-red-50 dark:bg-red-950/30">
                <CardContent className="p-6 space-y-4">
                  <h3 className="text-xl font-bold text-center">{t('doctor.confirmBooking')}</h3>
                  <div className="space-y-2 text-lg">
                    <p><strong>Doctor:</strong> {selectedDoctor.name}</p>
                    <p><strong>Specialty:</strong> {t(`doctor.specialties.${selectedDoctor.specialty}`)}</p>
                    <p><strong>Time:</strong> {selectedTime}</p>
                    <p><strong>Fee:</strong> ₹{selectedDoctor.fee}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-14 text-lg"
                  onClick={() => setStep('time')}
                >
                  {t('common.cancel')}
                </Button>
                <Button 
                  variant="healthcare"
                  className="flex-1 h-14 text-lg"
                  onClick={handleBooking}
                >
                  {t('common.confirm')}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center space-y-6 py-8">
              <div className="w-24 h-24 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-600">{t('doctor.bookingConfirmed')}</h2>
              <p className="text-lg text-muted-foreground">{t('doctor.appointmentDetails')}</p>
              <Card>
                <CardContent className="p-4 text-left">
                  <p><strong>Doctor:</strong> {selectedDoctor?.name}</p>
                  <p><strong>Time:</strong> {selectedTime}</p>
                </CardContent>
              </Card>
              <Button variant="healthcare" className="w-full h-14 text-lg" onClick={onBack}>
                {t('common.home')}
              </Button>
            </div>
          )}

          {/* Voice Status Indicator */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300',
              isListening && 'bg-red-500 animate-pulse',
              isSpeaking && 'bg-green-500',
              !isListening && !isSpeaking && 'bg-primary/20'
            )}>
              {isSpeaking ? (
                <Volume2 className="w-8 h-8 text-white animate-pulse" />
              ) : (
                <Mic className={cn('w-8 h-8', isListening ? 'text-white' : 'text-primary')} />
              )}
            </div>
            <VoiceIndicator isActive={isListening || isSpeaking} />
          </div>
        </div>
      </main>
    </div>
  );
}
