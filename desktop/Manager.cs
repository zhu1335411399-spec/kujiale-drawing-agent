using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

static class Data {
 public static Dictionary<string,object> Parse(string s){return new JavaScriptSerializer{MaxJsonLength=1048576}.Deserialize<Dictionary<string,object>>(s);}
 public static Dictionary<string,object> Obj(object v){return v as Dictionary<string,object>??new Dictionary<string,object>();}
 public static string Text(Dictionary<string,object>d,string k){object v;return d.TryGetValue(k,out v)&&v!=null?Convert.ToString(v):"";}
 public static object[] Arr(Dictionary<string,object>d,string k){object v;if(!d.TryGetValue(k,out v))return new object[0];var a=v as object[];if(a!=null)return a;var list=v as System.Collections.ArrayList;return list!=null?list.ToArray():new object[0];}
 public static bool Yes(Dictionary<string,object>d,string k){object v;return d.TryGetValue(k,out v)&&v is bool&&(bool)v;}
}
static class Registration {
 public static string Id(string root){
  var d=Data.Parse(File.ReadAllText(Path.Combine(root,"browser-extension","manifest.json"),Encoding.UTF8));
  using(var s=SHA256.Create()){var b=s.ComputeHash(Convert.FromBase64String(Data.Text(d,"key")));var o=new StringBuilder();for(int i=0;i<16;i++){o.Append((char)('a'+(b[i]>>4)));o.Append((char)('a'+(b[i]&15)));}return o.ToString();}
 }
 public static string Check(string browser,string root){
  string p="Software\\"+(browser=="Chrome"?"Google\\Chrome":"Microsoft\\Edge")+"\\NativeMessagingHosts\\com.kujiale.construction_drawing";bool denied=false;
  foreach(var h in new[]{RegistryHive.CurrentUser,RegistryHive.LocalMachine})foreach(var v in new[]{RegistryView.Registry32,RegistryView.Registry64}){
   try{using(var parent=RegistryKey.OpenBaseKey(h,v))using(var key=parent.OpenSubKey(p,false)){
    if(key==null)continue;string f=Convert.ToString(key.GetValue(""));if(!File.Exists(f))return "注册路径失效";
    var d=Data.Parse(File.ReadAllText(f,Encoding.UTF8));if(Data.Text(d,"name")!="com.kujiale.construction_drawing")return "宿主名称不匹配";
    string launcher=Data.Text(d,"path");if(!File.Exists(launcher))return "启动文件不存在";
    if(!File.Exists(Path.Combine(Path.GetDirectoryName(launcher),"runtime","node.exe")))return "宿主运行时缺失";
    foreach(var origin in Data.Arr(d,"allowed_origins"))if(Convert.ToString(origin)=="chrome-extension://"+Id(root)+"/")return "注册正常（实际接入另行检测）";
    return "扩展身份不匹配";
   }}catch(UnauthorizedAccessException){denied=true;}catch(System.Security.SecurityException){denied=true;}catch(Exception e){return "注册信息异常："+e.Message;}
  }return denied?"读取注册信息被拒绝，状态未知":"未注册，请点击修复接入";
 }
}
static class Program {
 [STAThread]static void Main(string[] args){
  if(Array.IndexOf(args,"--self-test")>=0){
   try{var d=Data.Parse("{\"browsers\":[{\"state\":\"heartbeat_expired\"}]}");if(ManagerForm.BrowserText(Data.Obj(Data.Arr(d,"browsers")[0]))!="心跳过期，页面已清空")throw new Exception();if(Registration.Id(AppDomain.CurrentDomain.BaseDirectory).Length!=32)throw new Exception();Environment.Exit(0);}catch{Environment.Exit(1);}return;
  }
  bool created;using(var m=new Mutex(true,"Local\\DrawingBridgeManager-"+WindowsIdentity.GetCurrent().User.Value,out created)){
   if(!created){MessageBox.Show("管理器已在运行，请从右下角托盘打开。");return;}
   Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new ManagerForm());
  }
 }
}
sealed class ManagerForm:Form {
 readonly string root=AppDomain.CurrentDomain.BaseDirectory;
 readonly Label service=new Label(),chrome=new Label(),edge=new Label(),regChrome=new Label(),regEdge=new Label(),activity=new Label(),timestamp=new Label();
 readonly DataGridView pages=new DataGridView();readonly TextBox log=new TextBox();readonly Button repair=new Button();
 readonly NotifyIcon tray=new NotifyIcon();readonly System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer();
 Process watcher;bool quitting,repairing;DateTime last=DateTime.MinValue;string latest="";
 public ManagerForm(){
  Text="施工图桥接管理器 0.6.0 · 安装修复与统一检测";Size=new Size(1020,760);MinimumSize=new Size(850,620);StartPosition=FormStartPosition.CenterScreen;Font=new Font("Microsoft YaHei UI",9F);
  var layout=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=7,Padding=new Padding(16)};
  foreach(float h in new float[]{36,160,44})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,h));
  layout.RowStyles.Add(new RowStyle(SizeType.Percent,100));foreach(float h in new float[]{32,92,42})layout.RowStyles.Add(new RowStyle(SizeType.Absolute,h));
  layout.Controls.Add(new Label{Text="Chrome 内部配置 + Edge 客户验证",AutoSize=true,Font=new Font(Font,FontStyle.Bold)},0,0);
  var states=new TableLayoutPanel{Dock=DockStyle.Fill,ColumnCount=1,RowCount=6};
  foreach(var l in new[]{service,regChrome,regEdge,chrome,edge,activity}){l.Dock=DockStyle.Fill;states.Controls.Add(l);}
  layout.Controls.Add(states,0,1);
  var actions=new FlowLayoutPanel{Dock=DockStyle.Fill,WrapContents=false};
  var reconnect=new Button{Text="启动 / 重新检测",AutoSize=true};reconnect.Click+=delegate{StopWatch();StartWatch();};
  repair.Text="修复接入";repair.AutoSize=true;repair.Click+=delegate{Repair();};
  var folder=new Button{Text="打开扩展目录",AutoSize=true};folder.Click+=delegate{Process.Start("explorer.exe",Q(Path.Combine(root,"browser-extension")));};
  var copy=new Button{Text="复制诊断",AutoSize=true};copy.Click+=delegate{Clipboard.SetText(service.Text+"\r\n"+regChrome.Text+"\r\n"+regEdge.Text+"\r\n"+latest);};
  actions.Controls.AddRange(new Control[]{reconnect,repair,folder,copy});layout.Controls.Add(actions,0,2);
  pages.Dock=DockStyle.Fill;pages.ReadOnly=true;pages.AllowUserToAddRows=false;pages.AllowUserToDeleteRows=false;pages.RowHeadersVisible=false;pages.AutoSizeColumnsMode=DataGridViewAutoSizeColumnsMode.Fill;
  foreach(string t in new[]{"浏览器","页面角色","实时访问","标题","页面地址","页面标识"})pages.Columns.Add(t,t);
  layout.Controls.Add(pages,0,3);timestamp.Dock=DockStyle.Fill;layout.Controls.Add(timestamp,0,4);
  log.Multiline=true;log.ReadOnly=true;log.ScrollBars=ScrollBars.Vertical;log.Dock=DockStyle.Fill;layout.Controls.Add(log,0,5);
  layout.Controls.Add(new Label{Dock=DockStyle.Fill,Text="服务在线、页面可访问与业务验收分别判断。客户归属、企业模板和“图纸&清单”尚未自动核验。关闭窗口缩到托盘。"},0,6);Controls.Add(layout);
  tray.Icon=SystemIcons.Application;tray.Text="施工图桥接管理器";tray.Visible=true;
  var menu=new ContextMenuStrip();menu.Items.Add("打开管理器",null,delegate{Show();WindowState=FormWindowState.Normal;Activate();});menu.Items.Add("退出管理器",null,delegate{quitting=true;Close();});tray.ContextMenuStrip=menu;tray.DoubleClick+=delegate{Show();WindowState=FormWindowState.Normal;Activate();};
  FormClosing+=delegate(object sender,FormClosingEventArgs e){if(!quitting&&e.CloseReason==CloseReason.UserClosing){e.Cancel=true;Hide();}};
  FormClosed+=delegate{timer.Stop();StopWatch();tray.Dispose();};Shown+=delegate{StartWatch();};
  timer.Interval=2000;timer.Tick+=delegate{CheckReg();if((DateTime.UtcNow-last).TotalSeconds>10){service.Text="服务：没有新鲜检测结果";service.ForeColor=Color.DarkOrange;ClearPages();}};timer.Start();
  service.Text="本机服务：检测中";ClearPages();CheckReg();
 }
 static string Q(string s){return "\""+s.Replace("\"","")+"\"";}
 void Ui(Action a){try{if(!IsDisposed&&IsHandleCreated)BeginInvoke(a);}catch(InvalidOperationException){}}
 void Log(string s){log.AppendText(DateTime.Now.ToString("HH:mm:ss")+"  "+s+Environment.NewLine);if(log.TextLength>16000)log.Text=log.Text.Substring(log.TextLength-12000);}
 void CheckReg(){regChrome.Text="Chrome 宿主："+Registration.Check("Chrome",root);regEdge.Text="Edge 宿主："+Registration.Check("Edge",root);}
 void ClearPages(){chrome.Text="Chrome 后端：尚无有效心跳";edge.Text="Edge 前端：尚无有效心跳";pages.Rows.Clear();activity.Text="最近 MCP 业务调用：尚未确认";}
 public static string BrowserText(Dictionary<string,object>d){string s=Data.Text(d,"state");return s=="connected"?"扩展已接入":s=="heartbeat_expired"?"心跳过期，页面已清空":"扩展未接入或浏览器未打开";}
 void State(string line){
  try{var d=Data.Parse(line);latest=line;last=DateTime.UtcNow;
   if(Data.Text(d,"service")!="running"){service.Text="本机服务：不可用";service.ForeColor=Color.Firebrick;ClearPages();Log(Data.Text(d,"error"));return;}
   service.Text="本机服务：运行中 · "+Data.Text(d,"version");service.ForeColor=Color.DarkGreen;ClearPages();
   foreach(var item in Data.Arr(d,"browsers")){var b=Data.Obj(item);string name=Data.Text(b,"browser"),role=Data.Text(b,"expectedRole");int count=0;
    foreach(var p in Data.Arr(b,"pages")){var x=Data.Obj(p);bool ok=Data.Yes(x,"accessible");if(ok&&Data.Text(x,"role")==role)count++;pages.Rows.Add(name,Data.Text(x,"role")=="config"?"后端配置":"设计器（模块待核验）",ok?"可访问":"未通过",Data.Text(x,"title"),Data.Text(x,"url"),Data.Text(x,"pageId"));}
    string text=name+(name=="Chrome"?" 后端：":" 前端：")+BrowserText(b)+"；目标角色可访问页面 "+count+" 个";if(name=="Chrome")chrome.Text=text;else if(name=="Edge")edge.Text=text;
   }
   object call;if(d.TryGetValue("lastToolCall",out call)&&call!=null)activity.Text="最近 MCP 业务调用："+Data.Text(Data.Obj(call),"name")+"（仅表示收到调用，不代表成功）";
   timestamp.Text="最近检测："+DateTime.Now.ToString("HH:mm:ss")+"；页面心跳超过 15 秒自动过期。";
   if(Data.Text(d,"unreportedClients")!=""&&Data.Text(d,"unreportedClients")!="0")timestamp.Text+=" 有旧版客户端未上报，请重新加载扩展。";
  }catch(Exception e){service.Text="状态读取失败";service.ForeColor=Color.Firebrick;ClearPages();Log(e.Message);}
 }
 void StartWatch(){
  if(watcher!=null&&!watcher.HasExited)return;string node=Path.Combine(root,"runtime","node.exe");if(!File.Exists(node)){Log("缺少随包运行时，请使用完整运行包或先运行安装。");return;}
  try{watcher=new Process{StartInfo=new ProcessStartInfo(node,Q(Path.Combine(root,"mcp","manager-watch.mjs"))){WorkingDirectory=root,UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true,StandardOutputEncoding=Encoding.UTF8,StandardErrorEncoding=Encoding.UTF8}};
   watcher.OutputDataReceived+=delegate(object sender,DataReceivedEventArgs e){if(!String.IsNullOrEmpty(e.Data))Ui(delegate{State(e.Data);});};
   watcher.ErrorDataReceived+=delegate(object sender,DataReceivedEventArgs e){if(!String.IsNullOrEmpty(e.Data))Ui(delegate{Log(e.Data);});};
   watcher.Start();watcher.BeginOutputReadLine();watcher.BeginErrorReadLine();Log("已启动统一检测，等待两浏览器扩展上报。");
  }catch(Exception e){Log(e.Message);}
 }
 void StopWatch(){if(watcher!=null){try{if(!watcher.HasExited)watcher.Kill();watcher.Dispose();}catch{}watcher=null;}last=DateTime.MinValue;ClearPages();}
 void Repair(){
  if(repairing)return;repairing=true;repair.Enabled=false;Log("正在修复当前安装的 Chrome / Edge 宿主注册…");
  Task.Run(delegate{string output;int code;
   try{var info=new ProcessStartInfo("powershell.exe","-NoProfile -ExecutionPolicy Bypass -File "+Q(Path.Combine(root,"install.ps1"))+" -InstallDirectory "+Q(root.TrimEnd(Path.DirectorySeparatorChar))){WorkingDirectory=root,UseShellExecute=false,CreateNoWindow=true,RedirectStandardOutput=true,RedirectStandardError=true};
    using(var p=Process.Start(info)){var a=p.StandardOutput.ReadToEndAsync();var b=p.StandardError.ReadToEndAsync();if(!p.WaitForExit(60000)){p.Kill();throw new Exception("安装修复超时");}output=a.Result+Environment.NewLine+b.Result;code=p.ExitCode;}
   }catch(Exception e){output=e.Message;code=-1;}
   Ui(delegate{repairing=false;repair.Enabled=true;CheckReg();if(code==0){Log("修复完成。请在 Chrome 和 Edge 扩展管理页分别重新加载扩展，再等待心跳。");StopWatch();StartWatch();}else{Log("修复未成功，未标为已连接。从资源管理器双击本程序后重试；仍失败时复制诊断。");Log(output);}});
  });
 }
}
