from fastapi import FastAPI, Request, Response, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
import gspread
from google.oauth2.service_account import Credentials
import pandas as pd
from datetime import datetime
import os
import json
import time

# =============================
# CONFIGURAÇÃO FASTAPI
# =============================
app = FastAPI(title="Gestor de Implantações")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================
# SERVI ARQUIVOS ESTÁTICOS
# =============================
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# =============================
# AUTENTICAÇÃO E USUÁRIOS
# =============================
USERS = {
    "implantação": {
        "password": "@ImplantaçãoMW2026!",
        "nome": "Implantação",
        "cargo": "Equipe de Implantação",
        "preferences": {"theme": "light"}
    },
    "supervisão": {
        "password": "@SupervisãoMW2026!",
        "nome": "Supervisão",
        "cargo": "Supervisor Implantação",
        "preferences": {"theme": "light"}
    },
    "presidência": {
        "password": "@PresidenciaMW2026!",
        "nome": "Presidência",
        "cargo": "Presidência MW",
        "preferences": {"theme": "light"}
    }
}

def get_current_user(request: Request):
    """Verifica se o usuário está autenticado via cookie"""
    user = request.cookies.get("session_user")
    if not user or user not in USERS:
        return None
    return user

def get_user_info(username):
    """Retorna informações do usuário"""
    if username in USERS:
        return {
            "username": username,
            "nome": USERS[username]["nome"],
            "cargo": USERS[username]["cargo"],
            "preferences": USERS[username].get("preferences", {"theme": "light"})
        }
    return None

# =============================
# ROTAS DE LOGIN (PÚBLICAS)
# =============================
@app.get("/login")
async def login_page(request: Request):
    """Página de login - Se já estiver logado, redireciona para /inicio"""
    user = get_current_user(request)
    if user:
        return RedirectResponse(url="/inicio")
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login(request: Request):
    """Endpoint de login"""
    try:
        data = await request.json()
        username = data.get("username")
        password = data.get("password")

        username_lower = username.lower().strip() if username else ""

        # Verificar credenciais
        for user_key, user_data in USERS.items():
            if user_key.lower() == username_lower and user_data["password"] == password:
                response = JSONResponse(content={
                    "message": "Login realizado com sucesso!",
                    "user": {
                        "username": user_key,
                        "nome": user_data["nome"],
                        "cargo": user_data["cargo"]
                    }
                })
                response.set_cookie(
                    key="session_user",
                    value=user_key,
                    httponly=True,
                    max_age=3600,  # 1 hora
                    path="/"
                )
                return response

        return JSONResponse(
            status_code=401,
            content={"message": "Usuário ou senha incorretos."}
        )
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"message": f"Erro no login: {str(e)}"}
        )

# =============================
# ROTAS PROTEGIDAS
# =============================
@app.get("/")
async def root(request: Request):
    """Redireciona baseado na autenticação"""
    user = get_current_user(request)
    if user:
        return RedirectResponse(url="/inicio")
    return RedirectResponse(url="/login")

@app.get("/inicio")
async def serve_frontend(request: Request):
    """Serve o dashboard principal"""
    user = get_current_user(request)
    if not user:
        return RedirectResponse(url="/login")

    return templates.TemplateResponse("dashboard.html", {"request": request})

@app.get("/api/user")
async def get_user(request: Request):
    """Retorna informações do usuário atual"""
    user = get_current_user(request)
    if not user:
        return JSONResponse(
            status_code=401,
            content={"error": "Não autorizado"}
        )

    user_info = get_user_info(user)
    return JSONResponse(content=user_info)

@app.post("/api/user/preferences")
async def save_preferences(request: Request):
    """Salva preferências do usuário"""
    user = get_current_user(request)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Não autorizado"})

    try:
        prefs = await request.json()
        if user in USERS:
            if "preferences" not in USERS[user]:
                USERS[user]["preferences"] = {}
            USERS[user]["preferences"].update(prefs)
            return {"status": "success", "preferences": USERS[user]["preferences"]}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

    return JSONResponse(status_code=404, content={"error": "Usuário não encontrado"})

@app.get("/logout")
async def logout():
    """Logout - remove cookie e redireciona para login"""
    response = RedirectResponse(url="/login")
    response.delete_cookie("session_user", path="/")
    return response

# =============================
# CONFIGURAÇÃO GOOGLE SHEETS
# =============================
SHEET_NAME = "FiliaisImplantadas"
WORKSHEET_NAME = "Principal"
CREDENTIAL_FILE = "organizacoescloud.json"
DATA_FILE = "dados/implantacoes.json"

def get_sheet_data():
    """Obtém dados da Google Sheets"""
    try:
        scope = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]

        creds = Credentials.from_service_account_file(
            CREDENTIAL_FILE,
            scopes=scope
        )

        client = gspread.authorize(creds)
        spreadsheet = client.open(SHEET_NAME)
        sheet = spreadsheet.worksheet(WORKSHEET_NAME)

        all_values = sheet.get_all_values()

        if not all_values or len(all_values) < 2:
            print("⚠️ Planilha vazia ou com apenas cabeçalho")
            return []

        headers = all_values[0]
        data_rows = all_values[1:]

        records = []
        for row in data_rows:
            if not any(row):
                continue
            record = {headers[i]: row[i] if i < len(row) else "" for i in range(len(headers))}
            records.append(record)

        print(f"✅ Dados carregados: {len(records)} registros")
        return records

    except Exception as e:
        print(f"❌ Erro ao acessar Google Sheets: {e}")
        if os.path.exists(DATA_FILE):
            print("⚠️ Usando dados em cache local")
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get('records', [])
            except:
                pass
        return []

def processar_dados(records):
    """Processa dados brutos"""
    if not records:
        return [], {}

    df = pd.DataFrame(records)

    column_mapping = {
        'Filial': 'filial_codigo',
        'Organização': 'organizacao_codigo',
        'Descrição Organização': 'organizacao_descricao',
        'Descrição Filial': 'filial_descricao',
        'Marca': 'marca',
        'Sistema': 'sistema',
        'Data Venda': 'data_venda',
        'Data da Implantação': 'data_implantacao',
        'Data Previsão': 'data_previsao',
        'Valor Comissão': 'valor_comissao',
        'Modalidade': 'modalidade',
        'Sistema Extração Desenvolvido': 'sistema_extracao',
        'Sistema Anterior': 'sistema_anterior',
        'Banco de Dados Anterior': 'banco_anterior',
        'Observações': 'observacoes',
        'Total ERP': 'total_erp',
        'Total Agregado': 'total_agregado',
        'Total': 'total_geral'
    }

    existing_columns = {k: v for k, v in column_mapping.items() if k in df.columns}
    df = df.rename(columns=existing_columns)

    required_columns = [
        'filial_codigo', 'organizacao_codigo', 'organizacao_descricao',
        'filial_descricao', 'marca', 'sistema', 'data_venda',
        'data_implantacao', 'data_previsao', 'valor_comissao', 'modalidade',
        'sistema_extracao', 'sistema_anterior', 'banco_anterior', 'observacoes',
        'total_erp', 'total_agregado', 'total_geral'
    ]

    for col in required_columns:
        if col not in df.columns:
            df[col] = ''

    df = df.fillna('')

    df['organizacao'] = df['organizacao_codigo'].astype(str) + ' - ' + df['organizacao_descricao'].astype(str)
    df['filial'] = df['filial_codigo'].astype(str) + ' - ' + df['filial_descricao'].astype(str)

    def parse_valor(v):
        if pd.isna(v) or v == '':
            return 0
        try:
            if isinstance(v, (int, float)):
                return float(v)
            v_str = str(v).replace('R$', '').replace('.', '').replace(',', '.').strip()
            return float(v_str) if v_str else 0
        except:
            return 0

    df['valor_comissao'] = df['valor_comissao'].apply(parse_valor)

    if 'total_erp' in df.columns:
        df['total_erp'] = df['total_erp'].apply(parse_valor)
    if 'total_agregado' in df.columns:
        df['total_agregado'] = df['total_agregado'].apply(parse_valor)
    if 'total_geral' in df.columns:
        df['total_geral'] = df['total_geral'].apply(parse_valor)

    dados = df.to_dict('records')

    resumo = {
        "total_organizacoes": int(df['organizacao_codigo'].nunique()),
        "total_registros": len(df),
        "total_filiais": int(df['filial_codigo'].nunique()),
        "ultima_atualizacao": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    }

    return dados, resumo

def salvar_dados_locais(dados, resumo):
    """Salva dados em cache local"""
    try:
        os.makedirs("dados", exist_ok=True)
        data_to_save = {
            "records": dados,
            "resumo": resumo,
            "timestamp": datetime.now().isoformat()
        }

        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, ensure_ascii=False, indent=2)

        print(f"💾 Dados salvos em {DATA_FILE}")
        return True
    except Exception as e:
        print(f"❌ Erro ao salvar dados: {e}")
        return False

# =============================
# ENDPOINTS DE DADOS (PROTEGIDOS)
# =============================

@app.get("/dados")
async def get_dados(request: Request, force_refresh: bool = False):
    """Endpoint de dados - Requer autenticação"""
    user = get_current_user(request)
    if not user:
        return JSONResponse(
            status_code=401,
            content={"error": "Não autorizado"}
        )

    try:
        if force_refresh:
            print("🔄 Forçando atualização dos dados...")
            start_time = time.time()

            if os.path.exists(DATA_FILE):
                try:
                    os.remove(DATA_FILE)
                    print(f"🗑️ Cache removido: {DATA_FILE}")
                except Exception as e:
                    print(f"⚠️ Erro ao remover cache: {e}")

            records = get_sheet_data()

            if not records:
                return {
                    "dados": [],
                    "resumo": {
                        "total_organizacoes": 0,
                        "total_registros": 0,
                        "total_filiais": 0,
                        "ultima_atualizacao": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
                    },
                    "forced": True,
                    "timestamp": datetime.now().isoformat(),
                    "tempo_carregamento": f"{time.time() - start_time:.2f}s"
                }

            dados, resumo = processar_dados(records)
            salvar_dados_locais(dados, resumo)

            elapsed = time.time() - start_time
            print(f"⚡ Atualização concluída em {elapsed:.2f}s")

            return {
                "dados": dados,
                "resumo": resumo,
                "forced": True,
                "timestamp": datetime.now().isoformat(),
                "tempo_carregamento": f"{elapsed:.2f}s"
            }

        else:
            if os.path.exists(DATA_FILE):
                try:
                    with open(DATA_FILE, 'r', encoding='utf-8') as f:
                        cached_data = json.load(f)

                    return {
                        "dados": cached_data.get("records", []),
                        "resumo": cached_data.get("resumo", {}),
                        "from_cache": True,
                        "timestamp": cached_data.get("timestamp")
                    }
                except Exception as e:
                    print(f"❌ Erro ao ler cache: {e}")
                    return await get_dados(request, force_refresh=True)

            print("📥 Arquivo local não encontrado, buscando do Google Sheets...")
            return await get_dados(request, force_refresh=True)

    except Exception as e:
        print(f"❌ Erro no endpoint /dados: {e}")
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                return {
                    "dados": cached_data.get("records", []),
                    "resumo": cached_data.get("resumo", {}),
                    "from_cache": True,
                    "error": str(e)
                }
            except:
                pass

        return {
            "dados": [],
            "resumo": {
                "total_organizacoes": 0,
                "total_registros": 0,
                "total_filiais": 0,
                "ultima_atualizacao": datetime.now().strftime("%d/%m/%Y %H:%M:%S")
            },
            "error": str(e)
        }

@app.get("/health")
async def health_check():
    """Verifica saúde da API"""
    local_data_exists = os.path.exists(DATA_FILE)
    return {
        "status": "ok",
        "data_file_exists": local_data_exists,
        "timestamp": datetime.now().isoformat()
    }

# =============================
# INICIALIZAÇÃO
# =============================

@app.on_event("startup")
async def startup_event():
    """Carrega dados ao iniciar o servidor"""
    print("🚀 Iniciando aplicação...")
    os.makedirs("dados", exist_ok=True)

    if not os.path.exists(DATA_FILE):
        try:
            records = get_sheet_data()
            dados, resumo = processar_dados(records)
            salvar_dados_locais(dados, resumo)
            print("✅ Dados iniciais carregados")
        except Exception as e:
            print(f"⚠️ Erro ao carregar dados iniciais: {e}")
    else:
        print("✅ Dados locais já existem")

# =============================
# EXECUÇÃO
# =============================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=5000, reload=True)