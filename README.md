# ʩ��ͼ���� Agent

������Ŀ��kujiale-drawing-agent��ʩ��ͼ Skill��MCP���������չ��reference �Ͱ�װ�ű�ȫ�������ڱ��ֿ⣬����������������ģ�ֿ�Ŀ¼��

## �����￪ʼ

- [���񡢹��ߡ�Skill �� Host �����ϵ](docs/architecture-and-entrypoints.md)
- [Skill ���](.agents/skills/kujiale-drawing-bridge/SKILL.md)
- [������������](.agents/skills/kujiale-drawing-bridge/references/workflow.md)
- [ҳ����ӿڲο�](.agents/skills/kujiale-drawing-bridge/references/routes.md)
- [����ע����ʽ����ɫ����](.agents/skills/kujiale-drawing-bridge/references/annotation-styles.md)
- [ע����ʽʵ���̵�](docs/annotation-style-inspection.md)
- [�������ԡ���ʾ��ʽ��ǰ������](skills/kujiale-drawing-bridge/references/object-config.md)
- [��չ�˺ż���빤����״̬](docs/extension-panel.md)
- [ע����ʽ�½����������ı��ֺű༭�뱣��](skills/kujiale-drawing-bridge/references/annotation-write.md)
- [MCP ����˵��](mcp/DESIGN.md)
- [����������](docs/pending-updates.md)
- [Ǩ�Ƽ�¼](docs/migration.md)

## Ŀ¼

| Ŀ¼/�ļ� | ���� |
|---|---|
| .agents/skills��.claude/skills | Codex / Claude ��Ӧ Skill ���� |
| skills | ��װ��ʹ�õ�ͬһ�� Skill |
| mcp | MCP ���񡢹��ߡ�Э�顢��ϺͲ��� |
| browser-extension | �������չԴ�� |
| docs��examples | ��Դ���������֤��¼�����ռƻ� |
| installer | ��װ˵�� |
| Start.cmd��start.ps1 | �������а���һ��������� |
| install.ps1��build.ps1 | ��װ���������ɼ���� |
| runtime/LICENSE | Node �ٷ�����֤�������Ʋ�����Դ��ֿ� |

## �汾��ʹ�ñ߽�

��ǰ���ᷢ�л���Ϊ 0.5.0��Դ��������������������ԭ���а�����ǩ��У���ļ������ֲ����·�����װ����

��ʷ���������� [ԭ�ֿ� 0.5.0 ����ҳ](https://github.com/zhu1335411399-spec/kujiale-model-agent/releases/tag/drawing-v0.5.0)���ȶ����ֿ⽨������֤��ɺ���Ǩ�Ʒ��и��������ܰ�Դ�� ZIP ������ Node �����а���

��ǰԴ�����ҳ���ȡ���ͻ����롢ǰ��ͷ��˶ԡ��½�����ʽ�ݸ壬�Լ�����ʽ����������ָ����¼�༭���ִ���档�������̼�ʵ������״̬�� [��������](skills/kujiale-drawing-bridge/references/capabilities.md) �� [����ʽ�����༭](skills/kujiale-drawing-bridge/references/line-style-edit.md)��ͨ�� drawing_save_config / drawing_publish_config ��Ϊδִ����ڣ�����ʽ��ִ���治��������������֧�֡�ǰ����ҵģ���顢�������ü���ǰƽ�沼��ͼ�Ĺ�������Ч����ʵ����֤���Զ���ע������Ϊ����ͼ����ʷ�汾�ָ���δ�Զ���ͨ��

ע����ʽҲ�ṩͬһ�����µ�ר�ù��ߣ������½��������������ı��ֺ��޸ĺͻ�ִ�����������ʵҳ�����������ˢ�¡�����ԭ�ͻ���ԭ ID ���ֶλض��������淶�ֶΡ�������������ǰ��Ӧ����δ���գ�����Ϸ�ע��д�����̡��˴θ��²������°�װ����

Դ������/����� Node.js 20+���������а��Դ� Node���״�ʹ�������û�������չ������ AI �ͻ�����Ŀ������¼�Լ����˺š����а������� AI �����������˺š�

������������ר�ù��ߣ�����/������ȡ�������Ա༭������ʽ�����滻�ͻ�ִ���档ǽ���������Զ�����ǳ���������滻������ʵҳ����ɱ��桢ˢ�¼�ͬ ID �ض������Ƴ���ǳ�������������ǰ����ҵģ��˶ԡ��������á�������ռ��ָ���ҵĵ�ǰ��ͼ���ա�����������òο���������һ�������֤�������з�����ֶΡ�

��չ�˺ż��ʹ�ù�����̨�������ͬһ�ĵ��Զ���ȡһ�Σ��ظ�����ϲ���ʧ�ܺͳ�ʱ��ѭ�����ԣ�ˢ��״̬��ǿ����ͣ����ť��ȷ���¡���ͨ��ƶ˿ɼ���˺ţ�ʩ��ͼ��״̬��Ч�����ն�����ʾ���״μ��ش˰汾���ڶ�Ӧ��������¼�����չһ�Σ�Ȩ�ޱ��ֲ��䣬�������°�װ����

## �������

```powershell
node --test mcp/line-style-runtime.test.mjs mcp/line-style-actions.test.mjs mcp/trusted-line-input.test.mjs mcp/http-server.test.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
```

�޸�ҳ�����Դ������� `node scripts/build-config-page-runtime.mjs` ������չ����ҳ�����ļ����޸Ĺ����߳����õ�ģ�����ʵ��ʹ�õ���������¼�����չ�����в��Ի����������������ʵ��ҳ������

GitHub �����������ֶ��������������޸Ĳο����ϲ����Զ������°���

