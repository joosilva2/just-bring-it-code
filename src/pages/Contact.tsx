import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";
const Contact = () => {
  return <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Entre em Contato</h1>
        
        <div className="space-y-6">
          <p className="text-gray-600">
            Estamos aqui para ajudar! Entre em contato conosco por qualquer um dos canais abaixo.
          </p>
          
          {/* Contact Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">E-mail</h3>
                  <p className="text-sm text-gray-500">Resposta em até 24h</p>
                </div>
              </div>
              <a href="mailto:contato@mesamaleta.com" className="text-primary font-medium hover:underline">contato@rcssports.com</a>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">WhatsApp</h3>
                  <p className="text-sm text-gray-500">Atendimento rápido</p>
                </div>
              </div>
              <a href="https://wa.me/5521999999999" target="_blank" rel="noopener noreferrer" className="text-green-600 font-medium hover:underline">(21) 998545120</a>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Phone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Telefone</h3>
                  <p className="text-sm text-gray-500">Seg-Sex, 9h às 18h</p>
                </div>
              </div>
              <p className="text-blue-600 font-medium">(21) 998545120</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Horário</h3>
                  <p className="text-sm text-gray-500">Atendimento</p>
                </div>
              </div>
              <p className="text-gray-700 font-medium">Seg a Sex: 9h às 18h</p>
            </div>
          </div>
          
          {/* Address */}
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Endereço</h3>
                <p className="text-gray-600">
                  RCS Sports Management & Solutions LTDA<br />
                  Rua Aylton Vasconcelos, 270 - Apt 202<br />
                  Jardim Guanabara<br />
                  Rio de Janeiro - RJ<br />
                  <span className="text-sm text-gray-500">CNPJ: 64.657.491/0001-20</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Map */}
          <div className="rounded-xl overflow-hidden h-64">
            <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3674.8163949483847!2d-43.10189672374685!3d-22.90509803838697!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x99820e4eee2d2b%3A0x2a1c47d66e90a3b3!2sJardim%20Guanabara%2C%20Rio%20de%20Janeiro%20-%20RJ!5e0!3m2!1spt-BR!2sbr!4v1707000000000!5m2!1spt-BR!2sbr" width="100%" height="100%" style={{
            border: 0
          }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Localização da empresa" />
          </div>
        </div>
      </div>
    </div>;
};
export default Contact;