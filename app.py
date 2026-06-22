from flask import Flask, render_template, request, jsonify
from anthropic import Anthropic
import json, uuid, base64, os
from datetime import datetime
from pathlib import Path

app = Flask(__name__)
client = Anthropic(api_key=os.getenv("CLAUDE_API_KEY"))

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/plantas")
def get_plantas():
    if not Path("plantas.json").exists():
        return jsonify([])
    return jsonify(json.load(open("plantas.json"))["plantas"])

@app.route("/api/plantas/<plant_id>", methods=["DELETE"])
def delete_planta(plant_id):
    data = json.load(open("plantas.json")) if Path("plantas.json").exists() else {"plantas": []}
    data["plantas"] = [p for p in data["plantas"] if p["id"] != plant_id]
    json.dump(data, open("plantas.json", "w"), ensure_ascii=False, indent=2)
    return jsonify({"success": True})

@app.route("/api/analyze", methods=["POST"])
def analyze():
    try:
        file = request.files["file"]
        img_b64 = base64.b64encode(file.read()).decode()
        plant_id = request.form.get("plant_id")
        
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=800,
            messages=[{"role": "user", "content": [{"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": img_b64}}, {"type": "text", "text": "JSON: {nombre_comun, especie, salud_porcentaje:0-100, estado, problemas_detectados:[], necesidades:[], consejos:[]}"}]}]
        )
        
        result = resp.content[0].text
        if "```" in result:
            result = result.split("```")[1].replace("json", "").strip()
        analysis = json.loads(result)
        
        data = json.load(open("plantas.json")) if Path("plantas.json").exists() else {"plantas": []}
        
        if plant_id:
            for p in data["plantas"]:
                if p["id"] == plant_id:
                    p["fotos"].append({
                        "fecha": datetime.now().isoformat(),
                        "salud": analysis.get("salud_porcentaje", 50),
                        "estado": analysis.get("estado", ""),
                        "foto": img_b64,
                        "consejos": analysis.get("consejos", [])
                    })
        else:
            data["plantas"].append({
                "id": str(uuid.uuid4()),
                "nombre": analysis.get("nombre_comun", "Planta"),
                "especie": analysis.get("especie", "?"),
                "fotos": [{
                    "fecha": datetime.now().isoformat(),
                    "salud": analysis.get("salud_porcentaje", 50),
                    "estado": analysis.get("estado", ""),
                    "foto": img_b64,
                    "consejos": analysis.get("consejos", [])
                }]
            })
        
        json.dump(data, open("plantas.json", "w"), ensure_ascii=False, indent=2)
        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
app.run(debug=True)
port = int(os.getenv('PORT', 5000))
app.run(host='0.0.0.0', port=port, debug=False)

